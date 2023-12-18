const sphere_count = 4;
const spheres = array<Sphere, sphere_count>(
  Sphere(vec3f(0.0, 0.0, -5.0), 1.0, Material(vec3f(1.0, 1.0, 0.0))),
  Sphere(vec3f(-2.0, 0.0, -5.0), 1.0, Material(vec3f(1.0, 1.0, 0.0))),
  Sphere(vec3f(2.0, 0.0, -5.0), 1.0, Material(vec3f(1.0, 1.0, 0.0))),
  Sphere(vec3f(0.0, -40.0, -5.0), 39.0, Material(vec3f(1.0, 1.0, 0.0)))
);


@group(0) @binding(1) var<uniform> params : Params;
@group(1) @binding(3) var outputTex : texture_storage_2d<rgba8unorm, write>;


fn ray_hits_spheres(ray: Ray) -> Intersection
{
    var min_dist = 1e6;
    var min_intersection: Intersection;
    for (var i = 0; i < sphere_count; i++)
    {
      let intersection = ray_sphere_intersection(ray, spheres[i]);
      if (intersection.hit && (intersection.t < min_dist))
      {
          min_dist = intersection.t;
          min_intersection = intersection;
      }
    }
    return min_intersection;
}


fn ray_color(ray: Ray) -> vec3f
{
    var intersection = ray_hits_spheres(ray);
    
    var counter = 0;
    var multiplier = 1.0;
    while (intersection.hit && counter < 5)
    {
        counter += 1;
        multiplier *= 0.5;
        let new_direction = random_on_hemisphere(intersection.normal);
        intersection = ray_hits_spheres(Ray(intersection.position, new_direction));
    }
    
    let a = 0.5*(ray.direction.y + 1.0);
    let color = (1.0-a)*vec3f(1.0, 1.0, 1.0) + a*vec3f(0.5, 0.7, 1.0);
    
    return multiplier * color;
}

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_invocation_id : vec3u,
  @builtin(local_invocation_id) local_invocation_id : vec3u
) {

    let pixelSize = 1.0/(params.textureSize.xy);
    uv = (vec2f(global_invocation_id.xy) + vec2f(0.5, 0.5)) * pixelSize;
    let aspectRatio = params.textureSize.x/params.textureSize.y;

    let coords = uv*2.0 - 1.0;
    // FOV = 2 arctan (w/2f)
    // w/2f = tan(fov/2)
    // 1/f = 2*tan(fov/2)/w
    // f = w/2*tan(fov/2)

    // let fov = radians(80.0);
    // let f = params.textureSize.x / 2.0*tan(fov/2.0);

    // let projectionMatrix = matrix4x4(
    //   f / params.textureSize.x, 0.0, 0.5
    //   0.0, f / params.textureSize.y, 0.0, 0.5,
    //   0.0, 0.0, 1.0);

    

    let samplesPerPixel = 100;
    var color = vec3f(0.0);
    for (var i = 0; i < samplesPerPixel; i++)
    {
      var noise = (2*rand_2() - vec2f(1.0)) * pixelSize;
      if (samplesPerPixel == 1)
      {
        noise = vec2f(0.0, 0.0);
      }
      let direction = -1*normalize(vec3f(vec2f(coords.x, coords.y/aspectRatio) + noise, 1));
      color += ray_color(Ray(vec3f(0.0), direction));
    }
    

    let writeIndex = vec2<i32>(global_invocation_id.xy);

    textureStore(outputTex, writeIndex, vec4(color/f32(samplesPerPixel), 1.0));
}

