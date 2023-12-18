
var<private> state: i32 = 0;
var<private> uv: vec2f = vec2f(0.0);

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
  return Intersection(false, vec3f(0.0), vec3f(0.0), 0.0);
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
    let normal =  normalize(intersectionPos - sphere.position);

    // var reflection = GetReflection(ray.direction, normal);

    return Intersection(true, intersectionPos, normal, t);
    
/*
    function GetReflection(incidentRay, planeNormal)
    {
      var dot = -vec3.dot(incidentRay, planeNormal);
      var ret = vec3.create();
      vec3.scale(ret, planeNormal, dot * 2);
      vec3.add(ret, ret, incidentRay);
      return ret;
    }
*/

}