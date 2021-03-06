import { mat4 } from 'gl-matrix';
import { DirectionalLight } from '../light/directionLight';
import { light } from '../light/light';
import { Box } from '../mesh';
import { Model } from '../mesh/model';
import { modelMat2WorldMat } from '../mesh/util';
import { baseMaterialType, getMaterial, ShaderOption } from '../shader/index';
import { CubeTexture } from '../texture';
import { IRenderAble } from '../toyEngine';

export class Scene implements IRenderAble {
    public constructor(gl: WebGLRenderingContext, ...models: Array<Model>) {
        this.models.push(...models);
        this.gl = gl;
    }

    public gl: WebGLRenderingContext;


    public projectionMat = mat4.create();

    public viewMat = mat4.create();

    public models = new Array<Model>();

    public light = new Array<light>();

    public render(next?: Model) {
        if (next === undefined) {
            this.models.forEach(x => this.setRenderVariable(x));
        } else {
            this.setRenderVariable(next);
        }
    }

    public addModel(...model: Model[]) {
        this.models.push(...model);
    }

    /**
     * 设置模型的各个灯的参数
     * @param material 
     */
    private setModelLight(material: baseMaterialType) {
        const directLight = this.light.filter(x => x instanceof DirectionalLight);
        DirectionalLight.setLightParams(material, directLight as DirectionalLight[]);
    }

    /**
     * 创建材质着色器
     */
    private createMatrial(target: Model) {
        const { gl } = this;
        const op = new ShaderOption();
        const directLight = this.light.filter(x => x instanceof DirectionalLight);
        if (directLight.length !== 0) {
            op.set(ShaderOption.DIRECTION_LIGHT);
            op.define.set('NUM_DIRECTIONAL_LIGHT', directLight.length);
        }
        if (target instanceof Box) {
            op.set(ShaderOption.CUBE);
            if (target.texture) {
                if (target.texture instanceof CubeTexture) {
                    op.set(ShaderOption.SMAPLER_CUBE);
                    if (!target.texture.loadSuccess()) {
                        target.texture.loadTex(gl);
                    }
                } else {
                    op.set(ShaderOption.SMAPLER_2D);
                    if (!target.texture.texture.loadSuccess()) {
                        target.texture.texture.loadTex(gl);

                    }
                }
            }

        }

        const material = getMaterial(gl, op);
        return material;
    }

    /**
     * 获取目标材质
     */
    private getTargetMaterial(target: Model) {
        let { material } = target;
        if (material === undefined) {
            material = this.createMatrial(target);
            target.material = material;
        }
        return material;
    }

    /**
     * 设置渲染的变量再渲染
     * @param model 
     */
    private setRenderVariable(model: Model) {
        const { gl } = this;
        const x = model;
        const nextModelMat = x.finalModelmat;
        const info = this.getTargetMaterial(x);
        info.switch2BindProgram();
        this.setModelLight(info);
        info.u_proj = this.projectionMat;
        info.u_view = this.viewMat;
        info.u_model = nextModelMat;
        info.u_world = modelMat2WorldMat(nextModelMat);
        const { size } = model;
        if (model.hasTex && size) { // 有纹理不需要颜色
            info.setUnif('u_CubeSize', size);
        } else {
            info.a_color?.set(x.color, x);
        }
        info.a_normal?.set(x.normal, x);
        info.a_pos.set(x.position, x);
        x.render(gl);
        x.children.forEach(y => this.render(y));
    }

}
