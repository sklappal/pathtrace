struct Params {
  textureSize : vec2<f32>
}

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var<uniform> params : Params;
@group(1) @binding(2) var inputTex : texture_2d<f32>;
@group(1) @binding(3) var outputTex : texture_storage_2d<rgba8unorm, write>;


@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
  @builtin(local_invocation_id) local_invocation_id : vec3<u32>
) {

    let color = textureSampleLevel(
          inputTex,
          samp,
          vec2<f32>(global_invocation_id.xy)/params.textureSize,
          0.0
        ).rgb;

    let writeIndex = vec2<i32>(global_invocation_id.xy);

    workgroupBarrier();

    textureStore(outputTex, writeIndex, vec4(color, 1.0));
}

