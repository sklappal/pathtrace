
const initInteraction = (canvas, gui, params) => {

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = params.textureWidth * devicePixelRatio
    canvas.height = params.textureHeight * devicePixelRatio

    let changed = false;

    gui.add(params, 'fov', 1, 140).step(1).onChange(() => changed = true);
    gui.add(params, 'lightIntensity', 1, 20).step(1).onChange(() => changed = true);
    gui.add(params, 'samplesPerPixel', 1, 20).step(1).onChange(() => changed = true);
    gui.add(params, 'exposure', 0, 7).step(0.1);
    gui.add(params, 'gamma', 0, 7).step(0.1);
    gui.add(params, 'tonemap_selection', 0.0, 3.0).step(1.0);
    gui.add(params, 'light_sampling_amount', 0.0, 1.0).step(0.1).onChange(() => changed = true);
    gui.add(params, 'sample_count').listen();
    gui.add(params, 'max_sample_count', 0, 100000).step(1000).onChange(() => changed = true)

    const keys = new Set();

    document.addEventListener('keydown', (evt) => keys.add(evt.code));
    document.addEventListener('keyup', (evt) => keys.delete(evt.code));
    canvas.addEventListener("mousedown", async () => {
        await canvas.requestPointerLock();
    });


    const updatePosition = (e) => {
        let dx = (5 * (e.movementX)) / innerWidth;
        let dy = (5 * (e.movementY)) / innerHeight;
        params.pitch -= dy;
        params.pitch = Math.min(Math.PI - 1e-6, Math.max(params.pitch, 1e-6))
        params.yaw -= dx;
        changed = true;
    }

    const lockChangeAlert = () => {
        if (document.pointerLockElement === canvas) {
            document.addEventListener("mousemove", updatePosition, false);
        } else {
            document.removeEventListener("mousemove", updatePosition, false);
        }
    }

    document.addEventListener("pointerlockchange", lockChangeAlert, false);

    canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    canvas.addEventListener("mouseup", (e) => {
        e.preventDefault();
        document.exitPointerLock()
    });

    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const sum = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
    const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]


    const updateInteraction = () => {
        let lookat = [Math.sin(params.yaw) * Math.sin(params.pitch), Math.cos(params.pitch), Math.cos(params.yaw) * Math.sin(params.pitch)]
        let vup = [0.0, 1.0, 0.0];

        let w = lookat;
        let u = cross(vup, w);
        let v = cross(w, u);
        const movement_rate = keys.has('ShiftLeft') ? 0.25 : 0.05;

        if (keys.has('KeyA')) {
            params.cameraPosition = sum(params.cameraPosition, mul(u, -movement_rate))
            changed = true;
        }
        if (keys.has('KeyD')) {
            params.cameraPosition = sum(params.cameraPosition, mul(u, +movement_rate))
            changed = true;
        }
        if (keys.has('KeyQ')) {
            params.cameraPosition = sum(params.cameraPosition, mul(v, -movement_rate))
            changed = true;
        }
        if (keys.has('KeyE')) {
            params.cameraPosition = sum(params.cameraPosition, mul(v, +movement_rate))
            changed = true;
        }
        if (keys.has('KeyW')) {
            params.cameraPosition = sum(params.cameraPosition, mul(w, -movement_rate))
            changed = true;
        }
        if (keys.has('KeyS')) {
            params.cameraPosition = sum(params.cameraPosition, mul(w, +movement_rate))
            changed = true;
        }
        let ret = changed;
        changed = false;
        return ret;
    }

    return {updateInteraction};


}


export default initInteraction;