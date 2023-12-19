// The linear-light input framebuffer
@group(0) @binding(0) var input  : texture_2d<f32>;

// The tonemapped, gamma-corrected output framebuffer
@group(0) @binding(1) var output : texture_storage_2d<rgba8unorm, write>;

const TonemapExposure = 0.5;

const Gamma = 2.2;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
  let color = textureLoad(input, invocation_id.xy, 0).rgb;
  let tonemapped = tonemap(color);
  let gammed = gamma(tonemapped);
  textureStore(output, invocation_id.xy, vec4f(gammed, 1));
}

fn reinhard_tonemap(linearColor: vec3f) -> vec3f {
  let color = linearColor * TonemapExposure;
  let mapped = color / (1+color);
  
  return mapped;
}

fn gamma(color: vec3f) -> vec3f
{
    return pow(color, vec3f(1 / Gamma));
}

fn tonemap(color: vec3f) -> vec3f
{
    let sig = max(color.r, max(color.g, color.b));
    return color.rgb * vec3(hable(sig) / sig);
}

fn hable(x: f32) -> f32
{
    let A = 0.15;
    let B = 0.50;
    let C = 0.10;
    let D = 0.20;
    let E = 0.02;
    let F = 0.30;

    return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}