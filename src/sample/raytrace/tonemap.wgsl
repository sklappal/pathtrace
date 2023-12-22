struct TonemapParams {
  exposure: f32,
  gamma: f32,
  tonemap_selection: f32
}

// The linear-light input framebuffer
@group(0) @binding(0) var input  : texture_2d<f32>;

// The tonemapped, gamma-corrected output framebuffer
@group(0) @binding(1) var output : texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(2) var<uniform> params : TonemapParams;


@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
  let color = textureLoad(input, invocation_id.xy, 0).rgb;
  var tonemapped: vec3f;

  if (params.tonemap_selection < 0.9)
  {
      tonemapped = reinhard_tonemap(color);
  }
  else if (params.tonemap_selection < 1.9)
  {
      tonemapped = exposuretonamep(color);
  }
  else 
  {
      tonemapped = habletonemap(color);
  }

  let gammed = gamma(tonemapped);
  textureStore(output, invocation_id.xy, vec4f(gammed, 1));
}

fn reinhard_tonemap(linearColor: vec3f) -> vec3f {
  let color = linearColor * params.exposure;
  let mapped = color / (1+color);
  
  return mapped;
}

fn gamma(color: vec3f) -> vec3f
{
    return pow(color, vec3f(1 / params.gamma));
}

fn habletonemap(v: vec3f) -> vec3f
{
    let curr = hable(v * params.exposure);

    let W = vec3f(11.2f);
    let white_scale = vec3f(1.0f) / hable(W);
    return curr * white_scale;
}

fn exposuretonamep(hdrColor: vec3f) -> vec3f
{
    // Exposure tone mapping
    return vec3(1.0) - exp(-hdrColor * params.exposure);
}

fn hable(x: vec3f) -> vec3f
{
    let A = 0.15;
    let B = 0.50;
    let C = 0.10;
    let D = 0.20;
    let E = 0.02;
    let F = 0.30;

    return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}