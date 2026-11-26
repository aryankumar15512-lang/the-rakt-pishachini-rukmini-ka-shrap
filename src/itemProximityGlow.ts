import * as THREE from 'three';

export interface ProximityGlowHandle {
  update: (
    elapsed: number,
    dt: number,
    playerLocalPos: THREE.Vector3,
    itemLocalPos: THREE.Vector3,
    visible: boolean,
  ) => void;
}

export interface AttachProximityGlowOptions {
  group: THREE.Group;
  targetMaterials: THREE.MeshStandardMaterial[];
  theme: 'relic' | 'key';
  phaseOffset?: number;
}

interface SparkDatum {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  speed: number;
  orbitRadius: number;
  angleOffset: number;
  swirlSpeed: number;
  maxRise: number;
  baseScale: number;
}

let sharedHaloTexture: THREE.CanvasTexture | null = null;
let sharedSparkGeo: THREE.SphereGeometry | null = null;

function getSharedHaloTexture(): THREE.CanvasTexture {
  if (sharedHaloTexture) return sharedHaloTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0.0, 'rgba(255, 245, 220, 0.95)');
  grad.addColorStop(0.24, 'rgba(255, 190, 110, 0.58)');
  grad.addColorStop(0.58, 'rgba(255, 115, 45, 0.18)');
  grad.addColorStop(1.0, 'rgba(255, 70, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  sharedHaloTexture = new THREE.CanvasTexture(canvas);
  sharedHaloTexture.colorSpace = THREE.SRGBColorSpace;
  return sharedHaloTexture;
}

function getSharedSparkGeo(): THREE.SphereGeometry {
  if (!sharedSparkGeo) {
    sharedSparkGeo = new THREE.SphereGeometry(0.015, 5, 4);
  }
  return sharedSparkGeo;
}

const _tmpEmissiveColor = new THREE.Color();

/**
 * Attaches a subtle, pulsing proximity glow + tiny slowly rising spark particles
 * to a Cursed Relic (warm crimson-gold) or the Haveli Master Key (antique gold).
 * Softly intensifies when the player walks within 8 meters so items are naturally
 * spottable inside dark rooms without cluttered HUD markers.
 */
export function attachProximityGlow(
  opts: AttachProximityGlowOptions,
): ProximityGlowHandle {
  const { group, targetMaterials, theme, phaseOffset = 0 } = opts;
  const isKey = theme === 'key';

  const colorLow = new THREE.Color(isKey ? 0xd99a24 : 0xd42218);
  const colorHigh = new THREE.Color(isKey ? 0xffe27a : 0xffa634);
  const haloTint = new THREE.Color(isKey ? 0xffcf5c : 0xff6b2b);

  // 1. Soft radial additive halo sprite centered on the item (replaces per-item PointLight to avoid WebGL uniform overflow)
  const haloMat = new THREE.SpriteMaterial({
    map: getSharedHaloTexture(),
    color: haloTint,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloSprite = new THREE.Sprite(haloMat);
  haloSprite.scale.setScalar(0.56);
  haloSprite.renderOrder = 2;
  group.add(haloSprite);

  // 3. 7 tiny slowly rising spark particles with smooth helical drift
  const sparkCount = 7;
  const sparkGeo = getSharedSparkGeo();
  const sparks: SparkDatum[] = [];
  const sparkPalette = isKey
    ? [0xffe07d, 0xffbe3b, 0xfff1b8]
    : [0xff6a24, 0xffb83c, 0xff3b2f];

  for (let i = 0; i < sparkCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: sparkPalette[i % sparkPalette.length],
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(sparkGeo, mat);
    group.add(mesh);

    sparks.push({
      mesh,
      mat,
      life: (i / sparkCount + phaseOffset * 0.13) % 1,
      speed: 0.24 + (i % 3) * 0.065,
      orbitRadius: 0.1 + (i % 4) * 0.042,
      angleOffset: (i / sparkCount) * Math.PI * 2,
      swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.9 + (i % 3) * 0.35),
      maxRise: 0.56 + (i % 3) * 0.11,
      baseScale: 0.72 + (i % 3) * 0.24,
    });
  }

  return {
    update: (elapsed, dt, playerLocalPos, itemLocalPos, visible) => {
      if (!visible) {
        return;
      }

      // Floor-aware distance: playerLocalPos.y is floor height and items rest ~0.95m above floor,
      // so same-floor triggers at an exact 8.0m radius while different floors (>= 4m apart) don't bleed.
      const dx = playerLocalPos.x - itemLocalPos.x;
      const floorDy = Math.abs(itemLocalPos.y - (playerLocalPos.y + 0.95));
      const dz = playerLocalPos.z - itemLocalPos.z;
      const dist = Math.hypot(dx, dz, floorDy * 2.2);

      const proxRaw = THREE.MathUtils.clamp((8.0 - dist) / 6.5, 0, 1);
      const prox = proxRaw * proxRaw * (3 - 2 * proxRaw); // smoothstep 0..1 inside 8m

      // Soft pulsing emissive sheen (gentle heartbeat breath)
      const pulseFreq = isKey ? 2.4 : 2.15;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * pulseFreq + phaseOffset);
      const shimmer = 0.5 + 0.5 * Math.sin(elapsed * 4.3 + phaseOffset * 1.7);

      // Blend emissive hue smoothly between base tint & warmer gold highlight as player approaches
      const colorMix = THREE.MathUtils.clamp(
        0.25 + pulse * 0.32 + prox * 0.43,
        0,
        1,
      );
      _tmpEmissiveColor.copy(colorLow).lerp(colorHigh, colorMix);

      const emissiveIntensity = isKey
        ? 0.42 + pulse * 0.28 + prox * (1.15 + shimmer * 0.22)
        : 0.58 + pulse * 0.3 + prox * (1.2 + shimmer * 0.24);

      for (let m = 0; m < targetMaterials.length; m++) {
        const mat = targetMaterials[m];
        mat.emissive.copy(_tmpEmissiveColor);
        mat.emissiveIntensity = emissiveIntensity;
      }

      // Soft radial halo intensifies & expands slightly within 8m
      haloMat.opacity =
        (isKey ? 0.22 : 0.26) + pulse * 0.1 + prox * (0.42 + shimmer * 0.08);
      const haloScale =
        (isKey ? 0.52 : 0.58) + pulse * 0.08 + prox * (0.38 + shimmer * 0.05);
      haloSprite.scale.setScalar(haloScale);

      // Animate tiny slowly rising spark particles
      const safeDt = Math.min(dt, 0.1);
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.life = (s.life + safeDt * s.speed * (1 + prox * 0.35)) % 1;
        const envelope = Math.sin(s.life * Math.PI); // 0 -> 1 -> 0 smooth fade
        const angle = s.angleOffset + elapsed * s.swirlSpeed;
        const r = s.orbitRadius * (0.82 + 0.35 * (1 - s.life));

        s.mesh.position.set(
          Math.cos(angle) * r,
          -0.08 + s.life * s.maxRise,
          Math.sin(angle) * r,
        );
        const sc = s.baseScale * (0.45 + envelope * (0.75 + prox * 0.45));
        s.mesh.scale.setScalar(sc);
        s.mat.opacity = envelope * (0.46 + prox * 0.48);
      }
    },
  };
}
