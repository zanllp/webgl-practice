import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';

export function resize(canvas: any) {
	// 获取浏览器中画布的显示尺寸
	let displayWidth = canvas.clientWidth;
	let displayHeight = canvas.clientHeight;

	// 检尺寸是否相同
	if (canvas.width !== displayWidth ||
		canvas.height !== displayHeight) {

		// 设置为相同的尺寸
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}

export function createShader({ gl, type, source }: { gl: WebGLRenderingContext; type: number; source: string; }) {
	var shader = gl.createShader(type);
	if (!shader) {
		throw new Error('shader err');
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		const msg = gl.getShaderInfoLog(shader);
		console.log(msg);
		gl.deleteShader(shader);
		throw new Error(`'createShader !success' ${msg}`);
	}
	return shader;
}
export const createProgramQuery = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
	return createProgram(gl, document.querySelector(vertex)!.textContent!, document.querySelector(fragment)!.textContent!);
};
export function createProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) {
	var program = gl.createProgram();
	if (!program) {
		throw new Error('! program');
	}
	gl.attachShader(program, createShader({ gl, type: gl.VERTEX_SHADER, source: vertexSrc }));
	gl.attachShader(program, createShader({ gl, type: gl.FRAGMENT_SHADER, source: fragmentSrc }));
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		const msg = gl.getProgramInfoLog(program);
		console.log(msg);
		gl.deleteProgram(program);
		throw new Error(`createProgram( !success ${msg}`);
	}
	return program;
}
const matCell = (rank: number, s: ArrayLike<number>) =>
	(row: number, col: number) => {
		return s[row * rank + col];
	};
export const mulM3V3 = (m: mat3, v: number[]) => {
	const c = matCell(3, m);
	const x = c(0, 0) * v[0] + c(0, 1) * v[1] + c(0, 2) * v[2];
	const y = c(1, 0) * v[0] + c(1, 1) * v[1] + c(1, 2) * v[2];
	const z = c(2, 0) * v[0] + c(2, 1) * v[1] + c(2, 2) * v[2];
	return [x, y, z];
};

export const mulV3M3 = (v: number[], m: mat3) => {
	const c = matCell(3, m);
	const x = c(0, 0) * v[0] + c(1, 0) * v[1] + c(2, 0) * v[2];
	const y = c(0, 1) * v[0] + c(1, 1) * v[1] + c(2, 1) * v[2];
	const z = c(0, 1) * v[0] + c(1, 2) * v[1] + c(2, 2) * v[2];
	return [x, y, z];
};

export const modifyWindow = (willAdd: any) => {
	// tslint:disable-next-line:forin
	for (const key in willAdd) {
		(window as any)[key] = willAdd[key];
	}
};
export const printMat = (rank: number, s: ArrayLike<number>) => {
	const res: any = {};
	const c = matCell(rank, s);
	for (let index = 0; index < rank; index++) {
		res[`row${index + 1}`] = {};
		for (let i_ = 0; i_ < rank; i_++) {
			res[`row${index + 1}`][`col${i_ + 1}`] = c(index, i_);
		}
	}
	console.table(res);
};
export const createWriteBufFn = (gl: WebGLRenderingContext) => {
	const fn = (data: Iterable<number>, size: number, location: number) => {
		writeBufferData(gl, data, size, location);
		return fn;
	};
	return fn;
};
export const writeMultiBuf = (gl: WebGLRenderingContext, p: { data: Iterable<number>; size: number; location: number }[]) => {
	p.forEach(x => writeBufferData(gl, x.data, x.size, x.location));
};

export const writeBufferData = (gl: WebGLRenderingContext, data: Iterable<number>, size: number, location: number) => {
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
};
export const degToRad = (d: number) => {
	return d * Math.PI / 180;
};
export function createMesh({ gl, posLoc, range = 1500, num = 10, is3d = false }: { gl: WebGLRenderingContext; posLoc: number; range?: number; num?: number; is3d?: boolean; }) {
	const data = [] as number[][];
	// 0 -> 1
	for (let i = 0; i < num + 1; i++) {
		const leftRow = [0, i / num];
		const rightRow = [1, i / num];
		const topCol = [i / num, 1];
		const bottomCol = [i / num, 0];
		data.push(leftRow, rightRow, topCol, bottomCol);
	}
	const dst = data.map((x) => {
		x[0] -= 0.5;
		x[1] -= 0.5;
		if (is3d) {
			x[2] = x[1];
			x[1] = 0;
		}
		return x;
	}).flat(2).map(x => x *= range);
	const size = is3d ? 3 : 2;
	writeBufferData(gl, dst, size, posLoc);
	gl.drawArrays(gl.LINES, 0, dst.length / size);
	return dst.length / size;
}
type typeAll = mat3 | mat4 | vec4 | vec3 | vec2 | number;
type constraintNull = { [x: string]: number };
type constraintAll = { [x: string]: typeAll | null };
const createSetUniformFn = (gl: WebGLRenderingContext, loc: WebGLUniformLocation | null) => {
	return (_: typeAll, trans = false) => {
		if (typeof _ === 'number') {
			gl.uniform1f(loc, _);
		} else {
			// 没有mat2因为不能和vec4区分
			// 不使用instanceof是因为mat,vec的类型有类，但实际是模块而是构造器
			switch (_.length) {
				case 2:
					gl.uniform2f(loc, _[0], _[1]);
					break;
				case 3:
					gl.uniform3f(loc, _[0], _[1], _[2]);
					break;
				case 4:
					gl.uniform4f(loc, _[0], _[1], _[2], _[3]);
					break;
				case 9:
					gl.uniformMatrix3fv(loc, trans, _);
					break;
				case 16:
					gl.uniformMatrix4fv(loc, trans, _);
					break;
				default:
					throw new Error('未定义类型');
			}
		}

	};
};

type unifType<U> = { [p in keyof U]: U[p] };
const programInfoFromKey = <A extends constraintNull, U extends constraintAll>({ gl, program, attribute, uniform }:
	{ gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
	gl.useProgram(program);
	const loc = {} as { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
	const res = {} as { program: WebGLProgram; loc: typeof loc; } & unifType<U> & { [p in keyof A]: Array<number> }; // 如果定义在一个即将展开的对象上,setget生效
	Object.keys(attribute).forEach(x => {
		(loc as any)[x] = gl.getAttribLocation(program, x);
		const size = attribute[x];
		let data = new Array<number>();
		Object.defineProperty(res, x, {
			set(_: any) {
				data = _;
				writeBufferData(gl, data, size, loc[x]);
			},
			get() {
				return data;
			}
		});
	});
	Object.keys(uniform).forEach(x => {
		const uloc = gl.getUniformLocation(program, x);
		const eset = createSetUniformFn(gl, uloc);
		Object.defineProperty(res, x, {
			set(_: any) {
				eset(_);
			},
			get() {
				return gl.getUniform(program, uloc as any);
			}
		});
		(res as any)[x] = uniform[x]; // 初始化设定值
		(loc as any)[x] = uloc;
	});
	res.program = program;
	res.loc = loc;
	return res;
};
export type programInfoT = ReturnType<typeof programInfoFromKey>;


export type programInfoParamsT<A, U> = {
	gl: WebGLRenderingContext;
	location: {
		attribute: A;
		uniform: U;
	},
	source: {
		vertex: string;
		fragment: string;
	}
};


export const createProgramInfo = <A extends constraintNull, U extends constraintAll>({ gl, location, source }: programInfoParamsT<A, U>) => {
	const program = createProgram(gl, source.vertex, source.fragment);
	return programInfoFromKey({ gl, program, attribute: location.attribute, uniform: location.uniform });
};

export const createSetValueFn = <T, V, U extends { value: V }>(gl: WebGLRenderingContext, programInfo: T, render: (gl: WebGLRenderingContext, info: T, v?: V) => any, state: U) =>
	(s: (Partial<V> | ((s: V) => Partial<V>) | { action: 'incr' | 'decr', key: keyof V, value: number })) => {
		let { value } = state;
		if (typeof s === 'object') {
			if ('action' in s) {
				const v = value as any;
				if (typeof v[s.key] !== 'number') {
					throw new Error(`key:${s.key} 不能作用于value:${value},type:${typeof v[s.key]}`);
				}
				switch (s.action) {
					case 'incr':
						v[s.key] += s.value;
						break;
					case 'decr':
						v[s.key] -= s.value;
						break;
				}
			} else {
				value = { ...value, ...s };
			}
		} else {
			value = { ...value, ...s(value) };
		}
		state.value = value;
		render(gl, programInfo, value);
		return value;
	};

export const array2Vec3 = (_: Array<number>) => vec3.fromValues(_[0], _[1], _[2]);
type PosDataType = number[][];
export const flatPos = (data: PosDataType) => {
	return data.flat(1);
};

export const randColor = (posData: PosDataType, factor = 1) => {
	const colorData = posData.map(() => {
		let color = Array.from(vec3.random(vec3.create()).map(Math.abs));
		if (factor !== 1) {
			color = color.map(_ => _ * factor);
		}
		return [color, color, color, color, color, color];
	}).flat(2);
	return colorData;
};

/**
 * 计算表面法线
 */
export const calcNormal = (posData: PosDataType) => {
	return posData.map((x) => {
		const e = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
		const v1 = vec3.sub(vec3.create(), e[1], e[0]);
		const v2 = vec3.sub(vec3.create(), e[2], e[0]);
		const normal = vec3.cross(vec3.create(), v1, v2);
		vec3.normalize(normal, normal);
		const res = Array.from(normal);
		return [res, res, res, res, res, res]; // 一个面2个三角形6个点
	}).flat(2);
};
type Info = {
	a_pos: Array<number>;
	a_normal: Array<number>;
	a_color: Array<number>;
	u_model: mat4;
	u_proj: mat4;
	u_view: mat4;
};
export class Model {
	constructor(data: PosDataType) {
		this.data = data;
		this.dataFlat = data.flat();
		this.normal = calcNormal(this.data);
	}
	public readonly data: PosDataType;
	public readonly dataFlat: Array<number>;
	public readonly normal: Array<number>;
	public modelMat?: mat4;
	public color = new Array<number>();
	public fillRandColor(factor = 1) {
		this.color = randColor(this.data, factor);
	}
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.TRIANGLES, 0, this.dataFlat.length / 3);
	}
	public setModelMat(fn: (_: mat4) => mat4 | void) {
		const mat = mat4.create();
		const res = fn(mat);
		if (res) {
			this.modelMat = res;
		} else {
			this.modelMat = mat;
		}
		return this.modelMat;
	}

}

export class Box extends Model {
	public constructor(x = 100, y = 100, z = 100) {
		const data = [
			// front
			[x, y, z,
				0, y, z,
				0, 0, z,
				x, y, z,
				0, 0, z,
				x, 0, z,],
			// back
			[x, y, 0,
				0, 0, 0,
				0, y, 0,
				x, y, 0,
				x, 0, 0,
				0, 0, 0,],
			// right
			[x, y, z,
				x, 0, z,
				x, 0, 0,
				x, y, 0,
				x, y, z,
				x, 0, 0,],
			//left
			[0, y, z,
				0, y, 0,
				0, 0, 0,
				0, y, z,
				0, 0, 0,
				0, 0, z,],
			//top
			[x, y, 0,
				0, y, 0,
				0, y, z,
				x, y, 0,
				0, y, z,
				x, y, z,],
			//bottom
			[0, 0, 0,
				x, 0, 0,
				0, 0, z,
				x, 0, 0,
				x, 0, z,
				0, 0, z,],
		];
		super(data);
	}
	public fillColor({ front, back, right, left, top, bottom }:
		{ front: number[]; back: number[]; right: number[]; left: number[]; top: number[]; bottom: number[]; }) {
		this.color = [front, back, right, left, top, bottom].map(c => [c, c, c, c, c, c]).flat(2);
	}
}

export class Scene<T extends Info> {
	public constructor(...models: Array<Model>) {
		this.models.push(...models);
	}
	private projectionMat = mat4.create();
	private viewMat = mat4.create();
	private models = new Array<Model>();
	public render(gl: WebGLRenderingContext, info: T) {
		info.u_proj = this.projectionMat;
		info.u_view = this.viewMat;
		this.models.forEach(x => {
			if (x.modelMat) {
				info.u_model = x.modelMat;
			}
			info.a_color = x.color;
			info.a_pos = x.dataFlat;
			info.a_normal = x.normal;
			x.render(gl);
		});
	}
	public addModel(...model: Model[]) {
		this.models.push(...model);
	}
	public setProjectionMat(fn: (_: mat4) => mat4 | void) {
		const mat = mat4.create();
		const res = fn(mat);
		if (res) {
			this.projectionMat = res;
		} else {
			this.projectionMat = mat;
		}
		return this.projectionMat;
	}
	public setViewMat(fn: (_: mat4) => mat4 | void) {
		const mat = mat4.create();
		const res = fn(mat);
		if (res) {
			this.viewMat = res;
		} else {
			this.viewMat = mat;
		}
		return this.viewMat;
	}
}

