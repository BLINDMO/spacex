// Δv loss accounting. Integrated each physics substep and accumulated in SimState.
// These are the classic ascent loss terms decomposed from the rocket equation budget:
//   Δv_ideal (engine)  =  Δv_gained  +  gravity loss  +  drag loss  +  steering loss

/** Gravity loss increment: component of gravity acting against the velocity direction.
 *  dV_grav = g · sin(flightPathAngle) · dt   (flight-path angle above local horizontal). */
export function gravityLoss(gMag: number, flightPathAngle: number, dt: number): number {
  return gMag * Math.sin(flightPathAngle) * dt;
}

/** Drag loss increment: deceleration from aerodynamic drag integrated over time. */
export function dragLoss(dragAccel: number, dt: number): number {
  return dragAccel * dt;
}

/** Steering (cosine) loss: thrust not aligned with velocity wastes Δv by (1 − cos α). */
export function steeringLoss(thrustAccel: number, alpha: number, dt: number): number {
  return thrustAccel * (1 - Math.cos(alpha)) * dt;
}

/** Ideal Δv produced by the engine this substep (thrust acceleration × dt). */
export function idealDv(thrustAccel: number, dt: number): number {
  return thrustAccel * dt;
}
