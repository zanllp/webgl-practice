import { mat4, vec3 } from 'gl-matrix';
import { createShaderMaterial } from '../glBase';
import { ShaderOption } from './shaderOption';
import { ShaderSource } from './shaderSource';
export type baseMaterialType = ReturnType<typeof createMaterial>;
const materialStore = new Map<number, baseMaterialType>();
export const getMaterial = (gl: WebGLRenderingContext, option = new ShaderOption()) => {
    let shader = materialStore.get(option.value);
    if (shader === undefined) {
        const source = new ShaderSource();
        if (option.has(ShaderOption.DIRECTION_LIGHT)) {
            source.addDefine('LIGHT');
            source.addDefine('DIRECTIONAL_LIGHT');
            source.addVariable('fragment', 'uniform', 'vec3', 'u_lightDirectional');
        }
        if (option.has(ShaderOption.SMAPLER_CUBE)) {
            source.addDefine('TEX_CUBE');
            source.addVariable('fragment', 'uniform', 'samplerCube', 'u_texture');
            source.addVariable('all','varying','vec3','v_cubeUv');
            source.addVariable('vertex','uniform','vec3','u_CubeSize');
        }
        shader = createMaterial(gl, source);
        materialStore.set(option.value, shader);
    }
    return shader;
};



export const createMaterial = (gl: WebGLRenderingContext, source: ShaderSource) => {
    const src = source.output();
    const vari = source.variableArray;
    const unif = {};
    const attr = {};
    console.info(src.vertex, src.fragment);
    vari.filter(x => x.varType === 'uniform').forEach(x => {
        (unif as any)[x.name] = null; // 混入增加的uniform，以便可以在材质的loc里获取地址
    });
    vari.filter(x => x.varType === 'attribute').forEach(x => {
        (attr as any)[x.name] = 3; // 一次读取3个
    });
    return createShaderMaterial({
        gl,
        location: {
            attribute: {
                a_pos: 3,
                a_color: 3,
                a_normal: 3,
                ...attr
            },
            uniform: {
                u_proj: mat4.create(),
                u_view: mat4.create(),
                u_model: mat4.create(),
                u_world: mat4.create(),
                u_viewWorldPos: vec3.create(),
                ...unif,
            }
        },
        source: src
    });
};


