import * as THREE from 'three';
import { CarModelConfig, CarUpgrades, DriftState, VehicleState } from '../types/game';
import { UPGRADE_TIERS } from '../data/cars';

export interface CarControlInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 to 1
  handbrake: boolean;
  nitro: boolean;
}

export class CarPhysics {
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading: number = 0; // Yaw angle in radians (0 = along -Z)
  public steerAngle: number = 0; // Front wheels angle in radians
  public angularVelocity: number = 0;

  // Engine state
  public rpm: number = 900;
  public gear: number | 'R' | 'N' = 1;
  public nitroAmount: number = 100; // 0 to 100
  public isNitroActive: boolean = false;

  // Drift metrics
  public driftState: DriftState = {
    isDrifting: false,
    angle: 0,
    score: 0,
    multiplier: 1.0,
    cashAccumulated: 0,
    comboTimer: 0,
    quality: 'BOM',
  };

  private config: CarModelConfig;
  private upgrades: CarUpgrades;

  // Cached calculated performance stats
  public maxSpeedKmh: number = 300;
  public accelForce: number = 18;
  public baseGrip: number = 0.92;
  public driftMultiplierBonus: number = 1.0;
  public steeringSensitivity: number = 1.0; // Adjustable multiplier (0.4x to 2.5x)

  // Sound & FX trigger callbacks
  public onCashEarned?: (amount: number, reason: string) => void;
  public onGearShift?: (newGear: number) => void;
  public onCrash?: () => void;

  constructor(config: CarModelConfig, upgrades: CarUpgrades, steeringSensitivity: number = 1.0) {
    this.config = config;
    this.upgrades = upgrades;
    this.steeringSensitivity = steeringSensitivity;
    this.recalculateStats();
  }

  public setSteeringSensitivity(val: number) {
    this.steeringSensitivity = Math.max(0.3, Math.min(2.5, val));
  }

  public setConfigAndUpgrades(config: CarModelConfig, upgrades: CarUpgrades) {
    this.config = config;
    this.upgrades = upgrades;
    this.recalculateStats();
  }

  private recalculateStats() {
    const engineTier = UPGRADE_TIERS.engine[Math.min(UPGRADE_TIERS.engine.length - 1, this.upgrades.engineStage - 1)];
    const transTier = UPGRADE_TIERS.transmission[Math.min(UPGRADE_TIERS.transmission.length - 1, this.upgrades.transmissionStage - 1)];
    const tireTier = UPGRADE_TIERS.tires[Math.min(UPGRADE_TIERS.tires.length - 1, this.upgrades.tiresStage - 1)];
    const nitroTier = UPGRADE_TIERS.nitro[Math.min(UPGRADE_TIERS.nitro.length - 1, this.upgrades.nitroStage - 1)];

    this.maxSpeedKmh = this.config.baseStats.topSpeed + (engineTier?.topSpeedBonus || 0);
    // Acceleration factor (higher is faster)
    this.accelForce = (12.0 / (this.config.baseStats.acceleration - (transTier?.accelBonus || 0))) * 4.2;
    this.baseGrip = 0.88 + (tireTier?.gripBonus || 0) * 0.005;
    this.driftMultiplierBonus = 1.0 + (tireTier?.driftBonus || 0);

    if (nitroTier) {
      this.nitroAmount = 100;
    }
  }

  // Transmission state
  public isManualTransmission: boolean = false;

  public shiftUp() {
    this.isManualTransmission = true;
    if (this.gear === 'R') {
      this.gear = 1;
      this.onGearShift?.(1);
    } else if (typeof this.gear === 'number' && this.gear < 6) {
      this.gear = (this.gear + 1) as number;
      this.onGearShift?.(this.gear);
    }
  }

  public shiftDown() {
    this.isManualTransmission = true;
    if (typeof this.gear === 'number') {
      if (this.gear > 1) {
        this.gear = (this.gear - 1) as number;
        this.onGearShift?.(this.gear);
      } else if (this.gear === 1 && this.velocity.length() * 3.6 < 20) {
        this.gear = 'R';
        this.onGearShift?.(0);
      }
    }
  }

  public toggleTransmissionMode() {
    this.isManualTransmission = !this.isManualTransmission;
  }

  public reset(position: THREE.Vector3, heading: number) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.steerAngle = 0;
    this.angularVelocity = 0;
    this.rpm = 900;
    this.gear = 1;
    this.nitroAmount = 100;
    this.isNitroActive = false;
    this.driftState.isDrifting = false;
    this.driftState.score = 0;
    this.driftState.multiplier = 1.0;
  }

  public update(dt: number, inputs: CarControlInputs, trackBonus = 1.0): VehicleState {
    // Clamp delta time to avoid physics tunneling on low frame rates
    const safeDt = Math.min(dt, 0.05);

    const speedMs = this.velocity.length();
    const speedKmh = speedMs * 3.6;

    // Unit forward vector and right vector based on car heading
    const forward = new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
    const right = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

    // Longitudinal speed (along car's heading) and lateral speed (sliding sideways)
    const forwardSpeed = this.velocity.dot(forward);
    const lateralSpeed = this.velocity.dot(right);

    // ---------------------------------------------------------
    // 1. STEERING DYNAMICS
    // ---------------------------------------------------------
    // At higher speeds, max steering lock angle reduces for realism and stability
    const sensitivity = Math.max(0.3, Math.min(2.5, this.steeringSensitivity || 1.0));
    const maxSteer = Math.max(0.24, 0.62 - (speedKmh / 280) * 0.38) * (0.85 + 0.25 * sensitivity);
    // inputs.steer: -1 for A (left), +1 for D (right)
    const targetSteer = inputs.steer * maxSteer;
    // Smooth steering interpolation (snappy response, natural centering)
    const steerSpeed = 16.0 * sensitivity;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, safeDt * steerSpeed);

    // ---------------------------------------------------------
    // 2. NITRO BOOST
    // ---------------------------------------------------------
    let nitroMultiplier = 1.0;
    if (inputs.nitro && this.nitroAmount > 1 && inputs.throttle > 0.1) {
      this.isNitroActive = true;
      this.nitroAmount = Math.max(0, this.nitroAmount - safeDt * 28.0);
      nitroMultiplier = 1.55;
    } else {
      this.isNitroActive = false;
      // Passive nitro regeneration
      this.nitroAmount = Math.min(100, this.nitroAmount + safeDt * 4.5);
    }

    // ---------------------------------------------------------
    // 3. THROTTLE, BRAKING, AND GEAR RATIOS
    // ---------------------------------------------------------
    let engineThrust = 0;
    const effectiveMaxSpeedKmh = this.maxSpeedKmh * (this.isNitroActive ? 1.25 : 1.0);
    const maxSpeedMs = Math.max(10, effectiveMaxSpeedKmh / 3.6);

    // Gear ratios for 6-speed sports transmission
    const gearRatios = [0.22, 0.42, 0.62, 0.8, 0.94, 1.05];

    if (!this.isManualTransmission) {
      // Automatic transmission logic
      if (forwardSpeed >= -0.5) {
        let currentGearIdx = 0;
        for (let g = 0; g < gearRatios.length; g++) {
          if (forwardSpeed <= gearRatios[g] * maxSpeedMs) {
            currentGearIdx = g;
            break;
          }
          currentGearIdx = gearRatios.length - 1;
        }
        const newGear = currentGearIdx + 1;
        if (this.gear !== newGear) {
          this.gear = newGear;
          this.onGearShift?.(newGear);
        }
      } else if (inputs.brake > 0.2 && forwardSpeed < -0.5) {
        this.gear = 'R';
      }
    }

    // Calculate RPM and Engine Thrust based on active gear
    if (this.gear !== 'R') {
      const currentGearNumber = typeof this.gear === 'number' ? Math.max(1, Math.min(6, this.gear)) : 1;
      const gearTopMs = gearRatios[currentGearNumber - 1] * maxSpeedMs;
      const gearBottomMs = currentGearNumber === 1 ? 0 : gearRatios[currentGearNumber - 2] * maxSpeedMs;
      const gearRange = Math.max(1.0, gearTopMs - gearBottomMs);

      const gearProgress = Math.max(0, Math.min(1.0, (forwardSpeed - gearBottomMs) / gearRange));
      this.rpm = Math.min(8800, 1000 + gearProgress * 7000 + inputs.throttle * 500);

      if (inputs.throttle > 0 && forwardSpeed < maxSpeedMs) {
        // Torque curve tapering near max speed of current gear
        const gearSpeedRatio = Math.min(1.0, forwardSpeed / gearTopMs);
        const torque = Math.max(0.1, 1.0 - Math.pow(gearSpeedRatio, 1.8)) * this.accelForce * nitroMultiplier;
        engineThrust = inputs.throttle * torque;
      }
    } else {
      // Reverse gear
      this.rpm = Math.min(6000, 1000 + (Math.abs(forwardSpeed) / 14) * 4500);
      if (inputs.brake > 0 && forwardSpeed > -15) {
        engineThrust = -inputs.brake * this.accelForce * 0.5;
      }
    }

    // Braking force
    let brakeForce = 0;
    if (inputs.brake > 0 && forwardSpeed > 0.5) {
      brakeForce = inputs.brake * 32.0; // Strong sports brakes
    } else if (inputs.brake > 0 && forwardSpeed <= 0.5 && !this.isManualTransmission) {
      // Reverse trigger in automatic mode
      this.gear = 'R';
      engineThrust = -inputs.brake * this.accelForce * 0.5;
    }

    // Handbrake force (breaks rear tire traction dramatically)
    let handbrakeFriction = 1.0;
    if (inputs.handbrake) {
      handbrakeFriction = 0.35; // Drops rear lateral grip
      brakeForce += 14.0;
    }

    // Aerodynamic drag + rolling resistance
    const dragForce = 0.0016 * speedMs * speedMs;
    const rollingResistance = 0.12 * (speedMs > 0.1 ? 1 : 0);

    // Apply longitudinal acceleration
    const netLongitudinalAccel = engineThrust - (Math.sign(forwardSpeed) * (brakeForce + dragForce + rollingResistance));
    this.velocity.addScaledVector(forward, netLongitudinalAccel * safeDt);

    // ---------------------------------------------------------
    // 4. LATERAL TIRE FRICTION & DRIFT DYNAMICS
    // ---------------------------------------------------------
    // Slip angle calculation (angle between heading and velocity)
    let slipAngleDeg = 0;
    if (speedKmh > 10) {
      const angleHeading = Math.atan2(forward.x, forward.z);
      const angleVel = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = (angleHeading - angleVel) * (180 / Math.PI);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      slipAngleDeg = Math.abs(diff);
    }

    // Lateral grip friction calculation
    let effectiveLateralGrip = this.baseGrip * handbrakeFriction;
    if (inputs.handbrake) {
      effectiveLateralGrip = 0.28; // Slick drift
    } else if (slipAngleDeg > 20) {
      // In a slide: reduced dynamic sliding friction
      effectiveLateralGrip = 0.45;
    }

    // Counteract lateral sliding based on tire grip
    const lateralDamping = Math.min(1.0, safeDt * effectiveLateralGrip * 18.0);
    this.velocity.addScaledVector(right, -lateralSpeed * lateralDamping);

    // ---------------------------------------------------------
    // 5. YAW ROTATION & TURNING (A = Left, D = Right)
    // ---------------------------------------------------------
    if (speedMs > 0.5) {
      // A (steer -1) must rotate CCW (positive angularVel in our coordinate space) -> turns left.
      // D (steer +1) must rotate CW (negative angularVel) -> turns right.
      const turnRadiusFactor = -this.steerAngle * (forwardSpeed / this.config.dimensions.wheelbase);
      let targetAngularVel = turnRadiusFactor * (0.85 + 0.25 * sensitivity);

      // Drift oversteer initiation on handbrake or snap throttle
      if (inputs.handbrake && speedKmh > 25) {
        targetAngularVel -= Math.sign(this.steerAngle || 1) * 2.2 * (0.9 + 0.2 * sensitivity);
      } else if (slipAngleDeg > 18 && inputs.throttle > 0.5) {
        // Holding power drift: engine power maintains tail slide
        targetAngularVel -= Math.sign(lateralSpeed) * 0.8;
      }

      const angularSpeed = 10.0 * Math.max(0.4, sensitivity);
      this.angularVelocity += (targetAngularVel - this.angularVelocity) * Math.min(1.0, safeDt * angularSpeed);
    } else {
      this.angularVelocity = 0;
    }

    this.heading += this.angularVelocity * safeDt;

    // Apply velocity to position
    this.position.addScaledVector(this.velocity, safeDt);

    // Final safety clamps on RPM
    if (!Number.isFinite(this.rpm) || isNaN(this.rpm)) {
      this.rpm = 1000;
    }

    // ---------------------------------------------------------
    // 6. DRIFT SCORING SYSTEM
    // ---------------------------------------------------------
    const isDriftingNow = slipAngleDeg >= 14 && speedKmh >= 32;

    if (isDriftingNow) {
      this.driftState.isDrifting = true;
      this.driftState.angle = Math.round(slipAngleDeg);
      this.driftState.comboTimer = 1.6; // Seconds to link drifts

      // Multiplier increases steadily during continuous drift
      this.driftState.multiplier = Math.min(5.0, this.driftState.multiplier + safeDt * 0.35 * this.driftMultiplierBonus);

      // Points calculation based on angle, speed, and combo multiplier
      const framePoints = (slipAngleDeg / 10) * (speedKmh / 20) * this.driftState.multiplier * 65 * safeDt;
      this.driftState.score += Math.round(framePoints);

      // Quality rating
      if (slipAngleDeg > 55) {
        this.driftState.quality = 'PERFEITO';
      } else if (slipAngleDeg > 38) {
        this.driftState.quality = 'INSANO';
      } else if (slipAngleDeg > 25) {
        this.driftState.quality = 'ÓTIMO';
      } else {
        this.driftState.quality = 'BOM';
      }

      // Bonus nitro refill when drifting well
      this.nitroAmount = Math.min(100, this.nitroAmount + safeDt * 12.0);
    } else {
      if (this.driftState.score > 0) {
        this.driftState.comboTimer -= safeDt;

        if (this.driftState.comboTimer <= 0) {
          // Drift combo completed successfully! Bank the cash!
          const earnedCash = Math.round((this.driftState.score * 0.12) * trackBonus);
          if (earnedCash > 50) {
            this.driftState.cashAccumulated += earnedCash;
            this.onCashEarned?.(earnedCash, `DRIFT ${this.driftState.quality}!`);
          }
          this.driftState.score = 0;
          this.driftState.multiplier = 1.0;
          this.driftState.isDrifting = false;
        }
      } else {
        this.driftState.isDrifting = false;
        this.driftState.angle = 0;
      }
    }

    return {
      speedKmh: Math.round(speedKmh),
      rpm: Math.round(this.rpm),
      gear: this.gear,
      isManualTransmission: this.isManualTransmission,
      nitroAmount: Math.round(this.nitroAmount),
      isNitroActive: this.isNitroActive,
      isBraking: inputs.brake > 0.1 && forwardSpeed > 1,
      isHandbraking: inputs.handbrake,
      steerAngle: this.steerAngle,
      driftState: { ...this.driftState },
    };
  }

  /**
   * Track barrier collision handler with elastic bounce and speed bleed
   */
  public handleBarrierCollision(normal: THREE.Vector3, bounceDampening = 0.5) {
    const dot = this.velocity.dot(normal);
    if (dot < 0) {
      // Reflect velocity along normal
      this.velocity.addScaledVector(normal, -(1 + bounceDampening) * dot);
      this.velocity.multiplyScalar(0.75); // Speed loss penalty

      // If hard crash while drifting, break combo
      if (this.velocity.length() * 3.6 > 40 && this.driftState.score > 100) {
        this.driftState.score = Math.floor(this.driftState.score * 0.4);
        this.driftState.multiplier = 1.0;
        this.onCrash?.();
      }
    }
  }
}
