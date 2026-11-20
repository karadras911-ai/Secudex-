import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _tmpColor = new THREE.Color();

export function prepareGeometry(geo, matrix = null, colorHex = null) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (matrix) {
    g.applyMatrix4(matrix);
  }
  const posAttr = g.getAttribute('position');
  const count = posAttr ? posAttr.count : 0;

  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }
  if (!g.getAttribute('uv') && count > 0) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }

  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
      g.deleteAttribute(key);
    }
  }

  if (colorHex !== null && count > 0) {
    _tmpColor.setHex(colorHex);
    const colArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colArr[i * 3] = _tmpColor.r;
      colArr[i * 3 + 1] = _tmpColor.g;
      colArr[i * 3 + 2] = _tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  } else if (g.getAttribute('color') && colorHex === null) {
    g.deleteAttribute('color');
  }

  return g;
}

export function mergePreparedGeometries(geos) {
  if (!geos || geos.length === 0) return null;
  if (geos.length === 1) return geos[0];
  const merged = mergeGeometries(geos, false);
  for (let i = 0; i < geos.length; i++) {
    geos[i].dispose();
  }
  if (merged) {
    merged.computeBoundingSphere();
  }
  return merged;
}
