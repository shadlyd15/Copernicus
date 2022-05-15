import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/build/three.module.js';
import {
    OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/controls/OrbitControls.js';

var PORT = 5000

function main() {
    const canvas = document.querySelector('#universe');
    const renderer = new THREE.WebGLRenderer({
        canvas,
        preserveDrawingBuffer: true
    });

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 300;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 30;
    var message_buffer = "";

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.update();

    var data_loading = false;
    const scene = new THREE.Scene();

    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }

    function data_to_points(data, body_idx) {
        // const curve = new THREE.SplineCurve();
        var points = new Array();
        data.bodies[body_idx].x.forEach((x, ndx) => {
            points.push(new THREE.Vector3(data.bodies[body_idx].x[ndx], data.bodies[body_idx].y[ndx], data.bodies[body_idx].z[ndx]));
        });
        return points;
    }

    function add_path(points, pcolor, npoints) {
        const curve = new THREE.CatmullRomCurve3(points);
        const new_points = curve.getPoints(npoints);
        const geometry = new THREE.BufferGeometry().setFromPoints(new_points);
        const material = new THREE.LineBasicMaterial({
            color: pcolor
        });
        const splineObject = new THREE.Line(geometry, material);
        console.log(splineObject);
        splineObject.name = "bodies_paths";
        scene.add(splineObject);
        return splineObject;
    }

    function renew_path(points, pcolor, npoints) {
        var selectedObject = scene.getObjectByName("bodies_paths");
        if (selectedObject) {
            selectedObject.geometry.dispose();
            selectedObject.material.dispose();
            console.log('Renewing Path');
            console.log(selectedObject.material);
            scene.remove(selectedObject);
        } else {
            add_path(points, pcolor, npoints)
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const new_points = curve.getPoints(npoints);
        const geometry = new THREE.BufferGeometry().setFromPoints(new_points);
        const material = new THREE.LineBasicMaterial({
            color: pcolor
        });
        const splineObject = new THREE.Line(geometry, material);
        //splineObject.rotation.x = Math.PI * .5;
        splineObject.position.y = 0.05;
        scene.add(splineObject);
    }

    function add_earth(x, y, z, m, r) {
        const radius = r;
        const widthSegments = r * 64;
        const heightSegments = r * 64;
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

        var material = new THREE.MeshPhongMaterial()
        material.map = THREE.ImageUtils.loadTexture('./images/textures/earth/earthmap.jpg')
        material.bumpMap = THREE.ImageUtils.loadTexture('./images/textures/earth/earthbump1k.jpg')
        material.bumpScale = 0.01
        material.specularMap = THREE.ImageUtils.loadTexture('./images/textures/earth/earthspec.tif')
        material.specular = new THREE.Color('grey')
        const body = new THREE.Mesh(geometry, material);

        scene.add(body);

        body.m = m;
        body.position.x = x;
        body.position.y = y;
        body.position.z = z;

        return body;
    }

    function add_mars(x, y, z, m, r) {
        const radius = r;
        const widthSegments = r * 64;
        const heightSegments = r * 64;
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

        var material = new THREE.MeshPhongMaterial()
        material.map = THREE.ImageUtils.loadTexture('./images/textures/mars/marsmap.jpg')
        material.bumpMap = THREE.ImageUtils.loadTexture('./images/textures/mars/marsbump1k.jpg')
        material.bumpScale = 0.05
        const body = new THREE.Mesh(geometry, material);

        scene.add(body);

        body.m = m;
        body.position.x = x;
        body.position.y = y;
        body.position.z = z;

        return body;
    }



    function add_sun(x, y, z, m, r) {
        const radius = r;
        const widthSegments = r * 64;
        const heightSegments = r * 64;
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

        var material = new THREE.MeshPhongMaterial()
        material.map = THREE.ImageUtils.loadTexture('./images/textures/sun/sunmap.jpg')

        const body = new THREE.Mesh(geometry, material);

        scene.add(body);

        body.m = m;
        body.position.x = x;
        body.position.y = y;
        body.position.z = z;

        return body;
    }


    {
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './images/skybox/right.png',
            './images/skybox/left.png',
            './images/skybox/top.png',
            './images/skybox/bottom.png',
            './images/skybox/front.png',
            './images/skybox/back.png',
        ]);
        scene.background = texture;
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }



    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '0x';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return parseInt(color);
    }


    var paths = new Array();

    var data_loaded = false;
    var colors = ['#FFC300', '#C70039', '#01CF8B']

    // DAT.GUI Related Stuff

    var gui = new dat.GUI();

    var start_animation = false;
    // Options to be added to the GUI
    var gui_control = {
        speed: 0.5,
        axis: false,
        grid: false,
        preset: '-----',
        G: 6.67,
        span: 5,
        span_unit: 'year',
        interval: 5,
        interval_unit: 'hour',
        grid: {
            xy: false,
            xz: false,
            yz: false
        }
    };


    const size = 100;
    const divisions = 100;

    const grid_xy = new THREE.GridHelper(size, divisions);
    const grid_xz = new THREE.GridHelper(size, divisions);
    const grid_yz = new THREE.GridHelper(size, divisions);

    grid_xy.geometry.rotateX(Math.PI / 2);
    grid_xz.geometry.rotateY(Math.PI / 2);
    grid_yz.geometry.rotateZ(Math.PI / 2);

    scene.add(grid_xy);
    scene.add(grid_xz);
    scene.add(grid_yz);


    function switch_grid(flag) {
        grid_xy.visible = flag.xy;
        grid_xz.visible = flag.xz;
        grid_yz.visible = flag.yz;
    }

    const bodies = [
        add_earth(5.0, 0.0, 0.0, 0.5, 1.0),
        add_sun(0.0, 0.0, 0.0, 0.5, 1.0),
        add_mars(-5.0, 0.0, 0.0, 0.5, 1.0)
    ];

    // ['ms', 'second', 'minute', 'hour', 'day', 'month', 'year']
    function get_multiplier(tag) {
        if (tag == 'ms') return 10;
        else if (tag == 'second') return 1;
        else if (tag == 'minute') return 60;
        else if (tag == 'hour') return 3600;
        else if (tag == 'day') return 3600 * 24;
        else if (tag == 'month') return 3600 * 24 * 30;
        else if (tag == 'year') return 365.26 * 24. * 3600;
        else return 1;
    }

    function get_inputs() {
        return {
            body_1: {
                m: bodies[0].m,
                x: bodies[0].position.x,
                y: bodies[0].position.y,
                z: bodies[0].position.z
            },
            body_2: {
                m: bodies[1].m,
                x: bodies[1].position.x,
                y: bodies[1].position.y,
                z: bodies[1].position.z
            },
            body_3: {
                m: bodies[2].m,
                x: bodies[2].position.x,
                y: bodies[2].position.y,
                z: bodies[2].position.z
            },
            G: gui_control.G / 100000000000,
            time_span: gui_control.span * get_multiplier(gui_control.span_unit),
            interval: gui_control.interval * get_multiplier(gui_control.interval_unit)
        }
    }

    function get_gui_controller(name) {
        var controller = null;
        var controllers = gui.__controllers;
        for (var i = 0; i < controllers.length; i++) {
            var c = controllers[i];
            if (c.property == name || c.name == name) {
                controller = c;
                break;
            }
        }
        return controller;
    }


    var preset_ids = []

    function updateDropdown(target, list) {
        var innerHTMLStr = "";
        for (var i = 0; i < list.length; i++) {
            preset_ids[i] = list[i];
            var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
            innerHTMLStr += str;
        }

        if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
    }


    function list_presets() {
        fetch('http://0.0.0.0:' + PORT + '/API/list_presets', {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            })
            .then((response) => response.json())
            .then((json) => {
                var message = JSON.stringify(json)
                var data = JSON.parse(message)
                console.log(message)
                updateDropdown(dropdown, data);
            });
    }

    list_presets()

    var options = {
        Solve: function() {
            data_loading = true;
            console.log("Inputs : ");
            console.log(get_inputs());
            console.log('Sending Request for Data ........');
            fetch('http://0.0.0.0:' + PORT + '/API/solve', {
                    method: 'POST',
                    body: JSON.stringify(get_inputs()),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                })
                .then((response) => response.json())
                .then((json) => {
                    var data = JSON.stringify(json);
                    var message = JSON.parse(data);
                    message_buffer = message;
                    console.log(typeof message)
                    console.log(typeof message_buffer)
                    console.log(message)

                    var points = [];
                    bodies.forEach((body, ndx) => {
                        // body.m = body[ndx].m;
                        points.push(data_to_points(message, ndx));
                        paths.push(new THREE.CatmullRomCurve3(points[ndx]));
                        add_path(points[ndx], colors[ndx], points[ndx].length);
                        data_loaded = true;
                        start_animation = true;
                        data_loading = false;
                        console.log("Data Loaded");
                    });
                });
        },
        Refresh: function() {
            window.location.reload();
        },
        Pause: function() {
            if (data_loaded) {
                if (start_animation) start_animation = false;
                else start_animation = true;
            }
        },
        Screenshot: function() {
            var imgData, imgNode;

            try {
                var strMime = "image/jpeg";
                imgData = renderer.domElement.toDataURL(strMime);

                export_image(imgData.replace(strMime, "image/octet-stream"), "Screenshot.jpg");

            } catch (e) {
                console.log(e);
                return;
            }
        },
        Logout: function() {
            var imgData, imgNode;
            try {
                window.location.href = '/logout';

            } catch (e) {
                console.log(e);
                return;
            }
        },
        Save: function() {
            data_loading = true;
            var str = '{"id" : "' + gui_control.preset + '"}';
            console.log("Saving .....")
            console.log("Here it is : ");
            console.log(typeof message_buffer);
            fetch('http://0.0.0.0:' + PORT + '/API/save_last', {
                    method: 'POST',
                    body: JSON.stringify(message_buffer),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                })
                .then((response) => response.json())
                .then((json) => {
                    var data = JSON.stringify(json)
                    var message = JSON.parse(data)
                    preset_ids.push(message.preset_id)
                    console.log(typeof message)
                    console.log(typeof message_buffer)
                    console.log(message)
                    data_loading = false;
                    list_presets()
                });
        },
        Load: function() {
            data_loading = true;
            var str = '{"id" : "' + gui_control.preset + '"}';
            console.log(str)
            fetch('http://0.0.0.0:' + PORT + '/API/load_preset', {
                    method: 'POST',
                    body: str,
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                })
                .then((response) => response.json())
                .then((json) => {
                    var data = JSON.stringify(json)
                    var message = JSON.parse(data)
                    console.log(message)

                    var points = [];
                    bodies.forEach((body, ndx) => {
                        console.log(message.bodies[ndx].m)
                        body.m = message.bodies[ndx].m
                        // console.log(body.m);
                        points.push(data_to_points(message, ndx));
                        paths.push(new THREE.CatmullRomCurve3(points[ndx]));
                        renew_path(points[ndx], colors[ndx], points[ndx].length);
                        data_loaded = true;
                        start_animation = true;
                        data_loading = false;
                        console.log("Data Loaded");
                    });
                });
        },
        Export: function() {
            var str = '{"id" : "' + gui_control.preset + '"}';
            console.log(str)
            fetch('http://0.0.0.0:' + PORT + '/API/load_preset', {
                    method: 'POST',
                    body: str,
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                })
                .then((response) => response.json())
                .then((json) => {
                    var data = JSON.stringify(json)
                    var message = JSON.parse(data)
                    export_data('data.log', data)
                });
        }
    };

    var cam = gui.addFolder('Earth');
    cam.add(bodies[0], 'm', 0.0, 50.0, 0.001).listen();
    cam.add(bodies[0].position, 'x', -150.0, 150.0).listen();
    cam.add(bodies[0].position, 'y', -150.0, 150.0).listen();
    cam.add(bodies[0].position, 'z', -150.0, 150.0).listen();
    var velocity = cam.addFolder('Velocity');
    velocity.add(bodies[1].position, 'x', -150.0, 150.0).name("Vx").listen();
    velocity.add(bodies[1].position, 'y', -150.0, 150.0).name("Vy").listen();
    velocity.add(bodies[1].position, 'z', -150.0, 150.0).name("Vz").listen();
    cam.open();

    var cam = gui.addFolder('Sun');
    cam.add(bodies[1], 'm', 0.0, 50.0, 0.001).listen();
    cam.add(bodies[1].position, 'x', -150.0, 150.0).listen();
    cam.add(bodies[1].position, 'y', -150.0, 150.0).listen();
    cam.add(bodies[1].position, 'z', -150.0, 150.0).listen();
    var velocity = cam.addFolder('Velocity');
    velocity.add(bodies[1].position, 'x', -150.0, 150.0).name("Vx").listen();
    velocity.add(bodies[1].position, 'y', -150.0, 150.0).name("Vy").listen();
    velocity.add(bodies[1].position, 'z', -150.0, 150.0).name("Vz").listen();
    cam.open();

    var cam = gui.addFolder('Mars');
    cam.add(bodies[2], 'm', 0.0, 50.0, 0.001).listen();
    cam.add(bodies[2].position, 'x', -150.0, 150.0).listen();
    cam.add(bodies[2].position, 'y', -150.0, 150.0).listen();
    cam.add(bodies[2].position, 'z', -150.0, 150.0).listen();
    var velocity = cam.addFolder('Velocity');
    velocity.add(bodies[1].position, 'x', -150.0, 150.0).name("Vx").listen();
    velocity.add(bodies[1].position, 'y', -150.0, 150.0).name("Vy").listen();
    velocity.add(bodies[1].position, 'z', -150.0, 150.0).name("Vz").listen();
    cam.open();

    var cam = gui.addFolder('Parameters');
    cam.add(gui_control, 'G', 0, 10.0).name("G (e-11)").step(0.01).listen();
    cam.open();
    var interval_folder = gui.addFolder('Interval');
    interval_folder.add(gui_control, 'interval', 0, 10.0).name("Interval").listen();
    interval_folder.add(gui_control, 'interval_unit', ['ms', 'second', 'minute', 'hour', 'day', 'month', 'year']).name("Unit").listen();
    var interval_folder = gui.addFolder('Timespan');
    interval_folder.add(gui_control, 'span', 0, 10.0).name("Step Size").listen();
    interval_folder.add(gui_control, 'span_unit', ['ms', 'second', 'minute', 'hour', 'day', 'month', 'year']).name("Unit").listen();



    var grid_folder = gui.addFolder('Grids');
    grid_folder.add(gui_control.grid, 'xy').name('XY').listen();
    grid_folder.add(gui_control.grid, 'xz').name('XZ').listen();
    grid_folder.add(gui_control.grid, 'yz').name('YZ').listen();

    var cam = gui.addFolder('Controls');
    cam.add(options, 'Solve');
    cam.add(options, 'Pause').name("Play/Pause");
    cam.add(options, 'Refresh');
    cam.add(gui_control, 'speed', 0, 1.0).listen();
    cam.add(gui_control, 'axis').listen();

    cam.open();

    var cam = gui.addFolder('Settings');
    var dropdown = cam.add(gui_control, 'preset', preset_ids);
    cam.add(options, 'Load');
    cam.add(options, 'Save');
    cam.add(options, 'Screenshot');
    cam.add(options, 'Export');
    cam.add(options, 'Logout');
    cam.open();


    var points = new Array();
    var idx = 0;

    const bodyPosition = new THREE.Vector3();
    const bodyTarget = new THREE.Vector3();
    var do_render = true;

    var export_image = function(strData, filename) {
        var link = document.createElement('a');
        if (typeof link.download === 'string') {
            document.body.appendChild(link); //Firefox requires the link to be in the body
            link.download = filename;
            link.href = strData;
            link.click();
            document.body.removeChild(link); //remove the link when done
        } else {
            location.replace(uri);
        }
    }

    function export_data(filename, text) {
        // Set up the link
        var link = document.createElement("a");
        link.setAttribute("target", "_blank");
        if (Blob !== undefined) {
            var blob = new Blob([text], {
                type: "text/plain"
            });
            link.setAttribute("href", URL.createObjectURL(blob));
        } else {
            link.setAttribute("href", "data:text/plain," + encodeURIComponent(text));
        }
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function render(time) {
        time *= 0.001;
        idx = idx + 1;

        axesHelper.visible = gui_control.axis;
        switch_grid(gui_control.grid);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        // Planets Animation
        bodies.forEach((body, ndx) => {
            if (start_animation) {
                const anime_time = time * gui_control.speed;
                const curve = new THREE.CatmullRomCurve3(points[ndx]);
                paths[ndx].getPointAt(anime_time % 1, bodyPosition);
                paths[ndx].getPointAt((anime_time + 0.01) % 1, bodyTarget);
                body.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
                body.lookAt(bodyTarget.x, bodyTarget.y, bodyPosition.z);
            }

            const speed = 1 + ndx * .1;
            const rot = time * speed;
            body.rotation.x = rot;
            body.rotation.y = rot;

        });

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();