
var<private> state: i32 = 0;
var<private> uv: vec2f = vec2f(0.0);

fn rand_1() -> f32 {
    return rand_2().x;
}

fn rand_2() -> vec2f
{
    state +=1;
    var p3 = vec3f(uv, f32(state));
    p3 = fract(p3 * vec3f(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

fn rand_3() -> vec3f
{
    state +=1;
    var p3 = vec3f(uv, f32(state));
    p3 = fract(p3 * vec3(.1001, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}


fn random_in_unit_sphere() -> vec3f {
    while (true) {
        let p = rand_3();
        if (dot(p, p) < 1)
        {
            return p;
        }
    }
    return vec3f(0.0);
}

fn random_unit_vector() -> vec3f {
    return normalize(random_in_unit_sphere());
}

fn random_on_hemisphere(normal: vec3f) -> vec3f {
    let on_unit_sphere = random_unit_vector();
    if (dot(on_unit_sphere, normal) > 0.0) // In the same hemisphere as the normal
    {
        return on_unit_sphere;
    }
    else
    {
        return -on_unit_sphere;
    }
}

fn no_hit() -> Intersection {
  return Intersection(false, vec3f(0.0), vec3f(0.0), 0.0, -1, false);
}

fn ray_sphere_intersection(ray: Ray, sphere: Sphere) -> Intersection
{
    let diff = ray.origin - sphere.position;
    let dott = dot(diff, ray.direction);
    let d = dott * dott - dot(diff, diff) + sphere.radius*sphere.radius;

    if (d < 0.0)
    {
      // no intersections
      return no_hit();
    }

    let sqrtD = sqrt(d);

    let first = -dott - sqrtD;
    let second = -dott + sqrtD;

    var t = -1.0;
    if (first < 1e-3)
    {
      if (second < 1e-3)
      {
        // Both points behind ray origin
        return no_hit();
      }
      // first point behind ray origin
      t = second;
    } 
    else if (second < 1e-3)
    {
      // second point behind ray origin
      t = first;
    }
    else
    {
      // Two intersections in front of us, take nearest
      // select(falseValue, trueValue, condition) 
      t = select(second, first, first < second);
    }
    let intersectionPos = ray.origin + ray.direction * t;
    let normal =  (intersectionPos - sphere.position) / sphere.radius;

    let front_face = dot(ray.direction, normal) < 0;

    return Intersection(
        true, 
        intersectionPos, 
        select(-normal, normal, front_face), 
        t, 
        sphere.material_index, 
        front_face);
}

fn reflect(v : vec3f, n : vec3f) -> vec3f {
    return v - 2*dot(v,n)*n;
}

fn refract(uv : vec3f, n : vec3f, etai_over_etat : f32) -> vec3f {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp =  etai_over_etat * (uv + cos_theta*n);
    let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}


fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0 = (1-ref_idx) / (1+ref_idx);
    r0 = r0*r0;
    return r0 + (1-r0)*pow((1 - cosine),5);
}


