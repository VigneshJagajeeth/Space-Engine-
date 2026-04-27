export type Matrix4x4 = [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
];

export const multiplyMatrix4 = (a: Matrix4x4, b: Matrix4x4): Matrix4x4 => {
    const result: Matrix4x4 = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            for (let k = 0; k < 4; k++) {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return result;
};

export const identityMatrix4 = (): Matrix4x4 => [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
];

export const translateMatrix4 = (tx: number, ty: number, tz: number): Matrix4x4 => [
    [1, 0, 0, tx],
    [0, 1, 0, ty],
    [0, 0, 1, tz],
    [0, 0, 0, 1]
];

export const scaleMatrix4 = (sx: number, sy: number, sz: number): Matrix4x4 => [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1]
];

export const rotateXMatrix4 = (deg: number): Matrix4x4 => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [1, 0, 0, 0],
        [0, c, -s, 0],
        [0, s, c, 0],
        [0, 0, 0, 1]
    ];
};

export const rotateYMatrix4 = (deg: number): Matrix4x4 => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [c, 0, s, 0],
        [0, 1, 0, 0],
        [-s, 0, c, 0],
        [0, 0, 0, 1]
    ];
};

export const rotateZMatrix4 = (deg: number): Matrix4x4 => {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [c, -s, 0, 0],
        [s, c, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
};

export const computeTransformMatrix4 = (tx: number, ty: number, tz: number, rotX: number, rotY: number, rotZ: number, sx: number, sy: number, sz: number): Matrix4x4 => {
    let m = identityMatrix4();
    m = multiplyMatrix4(m, translateMatrix4(tx, ty, tz));
    m = multiplyMatrix4(m, rotateXMatrix4(rotX));
    m = multiplyMatrix4(m, rotateYMatrix4(rotY));
    m = multiplyMatrix4(m, rotateZMatrix4(rotZ));
    m = multiplyMatrix4(m, scaleMatrix4(sx, sy, sz));
    return m;
};
