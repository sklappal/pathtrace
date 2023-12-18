const material_count = 5;
const materials = array<Material, material_count>(
  Material(vec3f(0.8, 0.8, 0.0), LAMBERTIAN, 0.0, 0.0),
  Material(vec3f(0.7, 0.3, 0.3), LAMBERTIAN, 0.0, 0.0),
  Material(vec3f(0.8, 0.8, 0.8), METAL, 0.3, 0.0),
  Material(vec3f(0.8, 0.6, 0.2), METAL, 1.0, 0.0),
  Material(vec3f(0.0, 0.0, 0.0), DIELECTRIC, 1.0, 1.5),

);


const sphere_count = 5;
const spheres = array<Sphere, sphere_count>(
  Sphere(vec3f(0.0, -40.0, -5.0), 39.0, 0),
  Sphere(vec3f(0.0, 0.0, -5.0), 1.0, 1),
  Sphere(vec3f(-2.0, 0.0, -5.0), 1.0, 2),
  Sphere(vec3f(2.0, 0.0, -5.0), 1.0, 4),
  Sphere(vec3f(2.0, 0.0, -5.0), -0.9, 4),
);


@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<uniform> viewMatrix : mat4x4f;
@group(0) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;


fn scatter(ray : Ray, intersection : Intersection) -> Scatter
{
    let material = materials[intersection.material_index];
    var new_direction: vec3f;
    var attenuation: vec3f;
    if (material.material_type == METAL)
    {
        new_direction = reflect(ray.direction, intersection.normal) + material.fuzz_factor * random_unit_vector();
        attenuation = material.color;
    }
    else if (material.material_type == DIELECTRIC)
    {
        attenuation = vec3f(1.0, 1.0, 1.0);
        let refraction_ratio = select(material.index_of_refraction, 1.0/material.index_of_refraction, intersection.front_face);

        let cos_theta = min(dot(-ray.direction, intersection.normal), 1.0);
        let sin_theta = sqrt(1.0 - cos_theta*cos_theta);

        let cannot_refract :bool = refraction_ratio * sin_theta > 1.0;
        new_direction = select(
          refract(ray.direction, intersection.normal, refraction_ratio),
          reflect(ray.direction, intersection.normal),
          cannot_refract || reflectance(cos_theta, refraction_ratio) > rand_1()
        );

       

    }
    else
    {
        new_direction = intersection.normal + random_unit_vector();
        
        // catch degenerate case
        if (dot(new_direction, new_direction) < 1e-6)
        {
             new_direction = intersection.normal;
        }
        attenuation = material.color;
    }
    
    return Scatter(
        Ray(intersection.position, normalize(new_direction)),
        attenuation
    );

}

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
    var cur_ray = ray;
    var color = vec3f(1.0);
    while (intersection.hit && counter < 5)
    {
        counter += 1;
        let scatter = scatter(cur_ray, intersection);
        color *= scatter.attenuation;
        cur_ray = scatter.scattered;
        intersection = ray_hits_spheres(cur_ray);
    }
    
    let a = 0.5*(ray.direction.y + 1.0);
    color *= (1.0-a)*vec3f(1.0, 1.0, 1.0) + a*vec3f(0.5, 0.7, 1.0);
    
    return color;
}

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_invocation_id : vec3u,
  @builtin(local_invocation_id) local_invocation_id : vec3u
) {

    let pixelSize = 1.0/(params.textureSize.xy);
    // This is to initialize the random generator state
    uv = (vec2f(global_invocation_id.xy) + vec2f(0.5, 0.5)) * pixelSize;
    let aspectRatio = params.textureSize.x/params.textureSize.y;


    let lookfrom = vec3f(params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z);
    let lookat = vec3f(params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z - 1);
    let vup = vec3f(0.0, 1.0, 0.0);
    
    let w = normalize(lookfrom - lookat);    
    let u = normalize(cross(vup, w));
    let v = cross(w, u);

    let center = lookfrom;

    let focal_length = 1.0;
    let theta = radians(params.fov);
    let h = tan(theta/2);
    let viewport_height = 2 * h * focal_length;
    let viewport_width = viewport_height * aspectRatio;
    let viewport_u = viewport_width * u;
    let viewport_v = -viewport_height * v;

    // Calculate the horizontal and vertical delta vectors from pixel to pixel.
    let pixel_delta_u = viewport_u / params.textureSize.x;
    let pixel_delta_v = viewport_v / params.textureSize.y;

    let viewport_upper_left = center - (focal_length * w) - viewport_u/2 - viewport_v/2;
    let pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

    var color = vec3f(0.0);

    let f = viewMatrix[0][0];
    for (var i = 0; i < i32(params.samplesPerPixel); i++)
    {
      var noise = 2*rand_2() - vec2f(1.0);
      if (i32(params.samplesPerPixel) == 1)
      {
        noise = vec2f(0.0, 0.0);
      }

      let offset = f32(global_invocation_id.x) * pixel_delta_u + f32(global_invocation_id.y) * pixel_delta_v;

      let pixel_center = pixel00_loc + offset + noise.x * pixel_delta_u + noise.y * pixel_delta_v;
      let ray_direction = normalize(pixel_center - center);

      color += ray_color(Ray(center, ray_direction));
    }
    

    let writeIndex = vec2<i32>(global_invocation_id.xy);

    textureStore(outputTex, writeIndex, vec4(color/params.samplesPerPixel, 1.0));
}

