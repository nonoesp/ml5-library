// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* eslint max-len: "off" */
/*
SketchRNN
*/

// Work-in-progress =)

// TODO: make utils/?
var sk = require('./sketch_rnn.js');
var model = require('./models/bird.gen.json');
var model_raw_data = JSON.stringify(model);

// TODO: move inside SketchRNN class
var model_data;
var model_pdf; // store all the parameters of a mixture-density distribution
var model_state, model_state_orig;
var model_prev_pen;
var predicted_strokes;
var model_x, model_y;
var absolute_x, absolute_y;

const DEFAULTS = {
    model_name_current: 'bird',
    strokes: [
        [-4, 0, 1, 0, 0],
        [-15, 9, 1, 0, 0],
        [-10, 17, 1, 0, 0],
        [-1, 28, 1, 0, 0],
        [14, 13, 1, 0, 0],
        [12, 4, 1, 0, 0],
        [22, 1, 1, 0, 0],
        [14, -11, 1, 0, 0],
        [5, -12, 1, 0, 0],
        [2, -19, 1, 0, 0],
        [-12, -23, 1, 0, 0],
        [-13, -7, 1, 0, 0],
        [-14, -1, 0, 1, 0]
    ],
    temperature: 0.25,
    min_sequence_length: 5,
    screen_scale_factor: 5.0,
}

class SketchRNN {
    constructor() {

    }

    setup() {
        sk.set_init_model(model_raw_data);
        model_data = sk.get_model_data();
        model = new sk.SketchRNN(model_data);
        model.set_pixel_factor(screen_scale_factor);
        encode_strokes();
        this.reset();
    }

    reset() {
        model_state = model.copy_state(model_state_orig);
        // Defines model_x and model_y with the end point of the given drawing "strokes"
        model_x = 0; //end_x;
        model_y = 0; //end_y;
        // Sets the previous status
        model_prev_pen = [0, 1, 0];
    }

    // TODO: make static
    encode_strokes() {
        // console.log('using these strokes:');
        // console.log(strokes);
        model_state_orig = model.zero_state();
        // encode strokes
        model_state_orig = model.update(model.zero_input(), model_state_orig);
        for (var i = 0; i < strokes.length; i++) {
            model_state_orig = model.update(strokes[i], model_state_orig);
        }
    }

    getModelStrokes() {

        var ended = false;
        var prediction = [];

        while (ended == false) {

            if (!ended) {
                var model_dx, model_dy;
                var model_pen_down, model_pen_up, model_pen_end;

                model_pdf = model.get_pdf(model_state);
                [model_dx, model_dy, model_pen_down, model_pen_up, model_pen_end] = model.sample(model_pdf, temperature);

                // Store sketch values as a flat array of floats [ [dx, dy, p1, p2, p3], […] ]
                prediction.push([model_dx, model_dy, model_pen_down, model_pen_up, model_pen_end]);

                if (model_prev_pen[0] === 1) {
                    // draw line connecting prev[ious] point to current point.
                }

                model_prev_pen = [model_pen_down, model_pen_up, model_pen_end];
                model_state = model.update([model_dx, model_dy, model_pen_down, model_pen_up, model_pen_end], model_state);

                model_x += model_dx;
                model_y += model_dy;

                if (model_pen_end === 1) {
                    ended = true;
                }
            }
        }

        return prediction;

    };

    // TODO: adapt to class (or make static)

    load_sketch_rnn() {
        sk = require('./sketch_rnn.js');
    }

    load_model(model_name) {
        if (model_name == model_name_current) {
            console.log("Currently using " + model_name);
            return;
        }

        console.log("Loading " + model_name);
        let model = require('./models/' + model_name + '.gen.json');
        model_raw_data = JSON.stringify(model);
        model_name_current = model_name;
    }

    output_strokes() {
        return predicted_strokes;
    }

    output_strokes_absolute() {

        let x = absolute_x;
        let y = absolute_y;

        let absolute_strokes = [
            [x, y, 1, 0, 0]
        ];

        for (var i in predicted_strokes) {

            let dx = predicted_strokes[i][0];
            let dy = predicted_strokes[i][1];
            let p1 = predicted_strokes[i][2];
            let p2 = predicted_strokes[i][3];
            let p3 = predicted_strokes[i][4];

            absolute_strokes.push([x + dx, y + dy, p1, p2, p3]);

            x += dx;
            y += dy;
        }

        return absolute_strokes
    }


    // set relative stroke from relative strokes
    set_strokes(s) {
        strokes = s;
    }


    // set relative strokes from an absolute strokes
    set_absolute_strokes(s) {
        let absolute_sketch = absolute2relative(s);
        strokes = absolute_sketch[0];
        absolute_x = absolute_sketch[1];
        absolute_y = absolute_sketch[2];
    }

    absolute2relative(strokes) {

        var rStrokes = [];
        let prev_x, prev_y;

        for (var i in strokes) {

            let x = strokes[i][0];
            let y = strokes[i][1];
            let p1 = strokes[i][2];
            let p2 = strokes[i][3];
            let p3 = strokes[i][4];

            if (i > 0) {
                rStrokes.push([x - prev_x, y - prev_y, p1, p2, p3]);
            }

            prev_x = x;
            prev_y = y;
        }

        // return strokes and last x, y
        return [rStrokes, prev_x, prev_y];
    }
}

const sketchRNN = () => {
    return new SketchRNN();
};

export default sketchRNN;