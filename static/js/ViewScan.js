
/* Helpful Functions */

// The Scan Object that defines the attributes that each Scan contains
class Scan {
    /*
    Takens in scan information and turns it into a Scan Object
    This object's id is then stored into the ALL_SCANS
    If the key/scan-date are not stored in DAY_SCANS then they are
    */
    constructor(row) {
        this.id = row.scan_id;
        this.img = row.scan_image;
        this.values = row.scan_values;
        this.alarm_lvl = row.alarm_lvl;

        this.max_val = Max(this.values);
        this.is_alarm = this.max_val > this.alarm_lvl;

        this.prev_scan = null;
        this.next_scan = null;

        this.height = window.innerHeight;

        // var date = new Date(this.id * 1000);
        this.date = row.scan_date;
        this.time = (Is24Hr()) ? row.scan_time : From24to12(row.scan_time);

        // Add the scan to the day map
        if (!DAY_SCANS.has(this.date)) {
            DAY_SCANS.set(this.date, [this.id]);
        } else {
            DAY_SCANS.get(this.date).push(this.id);
        }

        ALL_SCANS.set(this.id, this);
    }

    // Load this scan's data
    ViewScan() {
        this.LoadScanData();
        ViewPrevScans(this);
    }

    // resets the image and loads each data
    LoadScanData() {
        // Image
        try {
            if (this.img != undefined)
                $("#main_image").attr("src", this.img);
        } catch (e) {
            $("#main_image").attr("src", "silhouette.png");
        }

        // Date
        $("#prim_date").text(this.date);

        // Time
        $("#prim_time").text(this.time);

        // Max Val
        $("#prim_max").text(this.max_val);

        // Graph Data
        this.LoadGraphs();

        // Metal object detection
        if (this.is_alarm) {
            this.LoadDetectionRings("scan_image_container", "graph_canvas", "main_image");
            $("#primary_scan_cont").addClass("prim_alarm");
        } else {
            $("#primary_scan_cont").removeClass("prim_alarm");
        }
    }

    // Resets and draws the left and right graphs
    LoadGraphs() {
        var left_vals = this.values.slice(0, 6);
        var right_vals = this.values.slice(6);

        var is_alarm_left = Max(left_vals) > this.alarm_lvl;
        var is_alarm_right = Max(right_vals) > this.alarm_lvl;

        // Values are loaded in from top to bottom 6.0 -> 1.0
        ResetGraphs();
        this.LoadGraphValues(right_vals.reverse(), is_alarm_right, false);
        this.LoadGraphValues(left_vals.reverse(), is_alarm_left, true);

        // Load in the border for color
        $("#main_image").prop("class", "scan_image");
        $("#main_image").addClass((is_alarm_left || is_alarm_right) ? "alarm" : "clean");
    }

    // Sounds the alarm if the scan is one
    // Check if alarm sounds are enabled
    LoadAlarm() {
        if (this.is_alarm && GetLocalStorage("enable_alarm") == "true") {
            PlayAudio();
        }
    }

    // Loads the graph, prints differently for a left sided graph
    LoadGraphValues(vals, is_alarm, is_left) {
        var height_increments = 13; // 0.0 -> 6.5 (Depends on warping of image for clear view);
        var width_increments = 8; // 6 vertical spacers and 2 sides

        var canvas = (is_left) ? document.getElementById("left_canvas") : document.getElementById("right_canvas");
        var ctx = canvas.getContext("2d");
        ctx.font = "3em Arial";

        var width = canvas.width;
        var width_split = width / width_increments;

        var height = canvas.height;
        var height_split = height / height_increments;

        var max_val_round = Math.ceil(this.max_val / 10) * 10;
        max_val_round = (max_val_round < this.alarm_lvl) ? this.alarm_lvl : max_val_round * (4 / 3);

        var points = [];

        // Change the color to white if the user prefers dark mode
        var color_non_alarm = (IS_DARK_MODE) ? "white" : "black";
        ctx.fillStyle = color_non_alarm;
        ctx.strokeStyle = color_non_alarm;

        // Draw the height text
        for (var v = 0; v < height_increments; v++) {
            var top_padding = height_split * .5;
            var left_padding = (is_left) ? 0 : (width_split * width_increments) - 70;
            var y = (height_split * v) + top_padding * 1.25;
            var str = ((height_increments - v) * .5).toFixed(1).toString();
            ctx.fillText(str, left_padding, y);

            // Draw line
            ctx.lineWidth = 5;
            ctx.beginPath();
            if (is_left) {
                ctx.moveTo(0, y - 50);
                ctx.lineTo(width, y - 50);
            } else {
                ctx.moveTo(width, y - 50);
                ctx.lineTo(0, y - 50);
            }

            ctx.stroke();
        }

        // Draw a vertical line at where the alarm level would be (If the reading is above the alarm);
        ctx.strokeStyle = 'rgba(245, 100, 100, 0.75)';
        if (this.is_alarm) {
            var line_perc = (this.alarm_lvl / max_val_round);
            var line_perc_in = (is_left) ? (1 - (this.alarm_lvl / max_val_round)) : (this.alarm_lvl / max_val_round);
            ctx.beginPath();
            ctx.moveTo(line_perc_in * width, 0);
            ctx.lineTo(line_perc_in * width, height_split * (height_increments - 1));
            ctx.stroke();
            ctx.fillText(this.alarm_lvl, line_perc_in * width - 25, height_split * (height_increments - 1) + 65);
        }

        // Starting with the top reading at 6.0 all the way to 1.0
        for (var i = 0; i < vals.length; i++) {
            ctx.fillStyle = (vals[i] > this.alarm_lvl) ? "red" : color_non_alarm;
            ctx.strokeStyle = (vals[i] > this.alarm_lvl) ? "red" : color_non_alarm;

            // Find the x value (the percentage of the total width * the value);
            var line_perc = (vals[i] / max_val_round);
            var line_perc_in = (is_left) ? (1 - line_perc) : (line_perc);
            var calc_x = width * line_perc_in;

            // Find the y value (the whole number foot value);
            var calc_y = height_split * ((i * 2) + 1) + (.5 * height_split);

            points.push([calc_x, calc_y]);
        }

        var light_green = (IS_DARK_MODE) ? 'rgba(0, 208, 91, .75)' : 'rgba(6, 163, 75, 0.75)';
        var light_red = 'rgba(245, 100, 100, 0.75)';

        var bottom = (is_left) ? width : 0;
        ctx.strokeStyle = (is_alarm) ? light_red : light_green;
        ctx.fillStyle = (is_alarm) ? light_red : light_green;
        this.DrawUnderBars(ctx, points, bottom)


        this.DrawDots(ctx, points, is_left, vals);
    }

    // Draw the graph for each value
    DrawDots(ctx, points, is_left, vals) {

        // Change the color to white if the user prefers dark mode
        var color_non_alarm = (IS_DARK_MODE) ? "white" : "black";

        ctx.strokeStyle = color_non_alarm;
        ctx.fillStyle = color_non_alarm;
        ctx.lineWidth = 5;

        for (var i = 0; i < points.length; i++) {

            // ctx.strokeStyle = ((vals[i] > alarm_lvl)) ? "red" : "black";
            ctx.fillStyle = ((vals[i] > this.alarm_lvl)) ? "red" : "green";

            var point = points[i];

            // Draw a Circle at each line
            if (i != points.length - 1) {
                var end = points[i + 1];
                ctx.beginPath();
                ctx.moveTo(point[0], point[1]);
                ctx.lineTo(end[0], end[1]);
                ctx.stroke();
            }

            // Calc pixel movement
            var move = (35 * Math.ceil(Math.log10(vals[i])));


            // Write Value Text
            (is_left) ? ctx.fillText(vals[i], point[0] - move, point[1] + 20) : ctx.fillText(vals[i], point[0] + 15, point[1] + 20);

            // Draw the Circle
            ctx.beginPath();
            ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
        }
    }

    // Draw the lines between each circle
    DrawUnderBars(ctx, points, bottom) {
        // Draw a full path of the graph then fill it
        ctx.beginPath();
        ctx.moveTo(bottom, points[0][1]);
        for (var i = 0; i < points.length - 1; i++) {
            var start = points[i];
            ctx.lineTo(start[0], start[1]);
            ctx.stroke()
        }
        ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
        ctx.lineTo(bottom, points[points.length - 1][1]);
        ctx.lineTo(bottom, points[0][1]);
        ctx.fill();
    }

    // Goes through each max index to find viable places to put detection rings
    LoadDetectionRings(container_name, canvas_name, image_name, is_small = false) {
        // Reset the Canvas
        $(`.${container_name}`).append(`<canvas id=\"${canvas_name}\"></canvas>`);
        var canvas = document.getElementById(canvas_name);

        // console.log($(`#${image_name}`).width(), $(`#${image_name}`).height())

        canvas.width = $(`#${image_name}`).width();
        canvas.height = $(`#${image_name}`).height();

        // console.log(canvas.width, canvas.height);

        var left_vals = this.values.slice(0, 6);
        var right_vals = this.values.slice(6);

        var max = this.alarm_lvl;

        // Collect Peaks in the readings
        var left_peak = []
        var right_peak = []
        for (var i = 0; i < 6; i++) {
            left_peak.push(false);
            right_peak.push(false);

            var left_val = left_vals[i];
            var right_val = right_vals[i];

            if (i == 0) {
                if (left_val > max)
                    left_peak[i] = left_val > left_vals[i + 1];
                if (right_val > max)
                    right_peak[i] = right_val > right_vals[i + 1];
            }
            else if (i == 5) {
                if (left_val > max)
                    left_peak[i] = left_vals[i - 1] < left_val;
                if (right_val > max)
                    right_peak[i] = right_vals[i - 1] < right_val;
            }
            else {
                if (left_val > max)
                    left_peak[i] = (left_vals[i - 1] < left_val) && (left_val > left_vals[i + 1]);
                if (right_val > max)
                    right_peak[i] = (right_vals[i - 1] < right_val) && (right_val > right_vals[i + 1]);
            }
        }

        // Go down from each peak starting with the highest
        // Remove neighbors After completing each peak
        var temp = 0;
        while ((left_peak.indexOf(true) > -1 || right_peak.indexOf(true) > -1) && temp < 12) {
            temp += 1;
            var max_peak = -1;
            var peak_index = -1;
            var found_alarm = false;
            for (var i = 0; i < 6; i++) {
                if (left_peak[i] || right_peak[i]) {
                    if (left_vals[i] > max_peak) {
                        max_peak = left_vals[i];
                        peak_index = i;
                        found_alarm = true;
                    }

                    if (right_vals[i] > max_peak) {
                        max_peak = right_vals[i];
                        peak_index = i;
                        found_alarm = true;
                    }
                }
            }

            if (found_alarm) {
                this.CalcDetectionRing(peak_index, left_vals, right_vals, canvas_name, is_small);
                // Remove Neighbors from being used in pin placement
                try { left_peak[peak_index] = false } catch { }
                try { right_peak[peak_index] = false } catch { }
                try { left_peak[peak_index - 1] = false } catch { }
                try { right_peak[peak_index - 1] = false } catch { }
                try { left_peak[peak_index + 1] = false } catch { }
                try { right_peak[peak_index + 1] = false } catch { }
            }
        }
    }

    // Finds the percent from the left to move and the direction (up or down) to shift before drawing a circle
    CalcDetectionRing(max_index, left_vals, right_vals, canvas_name, is_small) {
        var l_total = 0,
            r_total = 0;
        var m_total = 0,
            b_total = 0,
            t_total = 0;

        // Both fills and checks if each addition is possible
        try {
            t_total = left_vals[max_index - 1] + right_vals[max_index - 1];
            l_total += (isNaN(left_vals[max_index - 1])) ? 0 : left_vals[max_index - 1];
            r_total += (isNaN(right_vals[max_index - 1])) ? 0 : right_vals[max_index - 1];
        } catch (e) { }
        try {
            m_total = left_vals[max_index] + right_vals[max_index];
            l_total += left_vals[max_index]
            r_total += right_vals[max_index]
        } catch (e) { }
        try {
            b_total = left_vals[max_index + 1] + right_vals[max_index + 1];
            l_total += (isNaN(left_vals[max_index + 1])) ? 0 : left_vals[max_index + 1];
            r_total += (isNaN(right_vals[max_index + 1])) ? 0 : right_vals[max_index + 1];
        } catch (e) { }

        // If the index is at the top or bottom we consider the only neighboring sensor less
        if (max_index == 5) {
            t_total *= (1 / 3); // Consider the bottom neighbior sensor less
            l_total -= (isNaN(left_vals[4])) ? 0 : left_vals[4];
            r_total -= (isNaN(right_vals[4])) ? 0 : right_vals[4];
        } else if (max_index == 0) {
            b_total *= (1 / 3); // Consider the top neighbior sensor less
            l_total -= (isNaN(left_vals[1])) ? 0 : left_vals[1];
            r_total -= (isNaN(right_vals[1])) ? 0 : right_vals[1];
        }

        t_total = (isNaN(t_total)) ? 0 : t_total;
        b_total = (isNaN(b_total)) ? 0 : b_total;

        var l_sqrt = Math.sqrt(l_total);
        var r_sqrt = Math.sqrt(r_total);
        var center_width_perc = r_sqrt / (l_sqrt + r_sqrt);

        var center_height_perc = (-1 * (b_total / (b_total + m_total))) + (t_total / (t_total + m_total));

        this.DrawDetectionRing(center_width_perc, center_height_perc, max_index, canvas_name, is_small);
    }

    // Draws the ring as the given percentages
    DrawDetectionRing(perc_width, perc_height, height_index, canvas_name, is_small) {
        var canvas = document.getElementById(canvas_name);
        var ctx = canvas.getContext("2d");

        if (window.innerHeight > this.height)
            this.height = window.innerHeight;
        var size_change = this.height / window.innerHeight;

        var width = canvas.width / size_change;
        var height = canvas.height / size_change;
        var height_split = height / 7;

        ctx.lineWidth = (is_small) ? 3 : 5; // 2;

        var sizes = (is_small) ? [5.0, 8.0, 12.0] : [8.0, 14.0, 20.0];
        for (var i in sizes) {
            sizes[i] /= size_change;
        }

        var x = width * perc_width;
        var y_base_height = (height_split * height_index);
        var y_interlope = (height_split * perc_height) * -1; // -1 because canvas works from top to bottom
        // var y = height - (height_split) - (y_interlope + y_base_height);
        var y = height - height_split * (height_index - perc_height + 1);

        var tau = Math.PI * 2;

        // Center
        ctx.beginPath();
        ctx.strokeStyle = "yellow";
        ctx.arc(x, y, sizes[0], 0, tau, true); // 4
        ctx.stroke();

        // Middle
        ctx.beginPath();
        ctx.strokeStyle = "orange";
        ctx.arc(x, y, sizes[1], 0, tau, true); // 7
        ctx.stroke();

        // Outer
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.arc(x, y, sizes[2], 0, tau, true); // 10
        ctx.stroke();
    }


    // Below is for drawing on the prior scan images
    DrawPrevRings(prev_num) {
        $(`#prev_${prev_num}_graph_canvas`).remove();
        this.LoadDetectionRings(`prev_scan_cont_${prev_num}`, `prev_${prev_num}_graph_canvas`, `prev_${prev_num}_img`, true);
    }


}

// Loads all the parts of a scan
function ViewScan(scan) {
    if (scan == undefined) {
        console.warn("Scan Undefined");
        return;
    }
    console.log("ViewScan");

    // Set the active event
    $(".active_event").removeClass("active_event");
    $(ID_TO_ELEMENT.get(scan.id)).addClass("active_event");

    scan.ViewScan();
}

function ViewPrevScans(vis_scan) {
    var scan_1 = null,
        scan_2 = null;

    // Clean the boxes
    $("#scan_1_cont").prop("class", "section_cont prev_scan_body col-xl-2 col-sm-5-5 mx-2 ml-xl-auto");
    $("#scan_2_cont").prop("class", "section_cont prev_scan_body col-xl-2 col-sm-5-5 mx-2 ml-xl-auto");
    $(`#prev_1_graph_canvas`).remove();
    $(`#prev_2_graph_canvas`).remove();

    // First Prev Scan
    $("#prev_1_img").prop("class", "scan_image");

    try {
        scan_1 = ALL_SCANS.get(vis_scan.prev_scan);
        var max_1 = Max(scan_1.values);
        $("#prev_1_img").attr("src", scan_1.img);
        $("#prev_1_time").text(scan_1.time);
        $("#prev_1_max").text(max_1);
        $("#prev_1_img").addClass((scan_1.is_alarm) ? "alarm" : "clean");
        $("#scan_1_cont").addClass((scan_1.is_alarm) ? "alarm" : "clean");
        $("#scan_1_cont").prop("value", scan_1.id);
        scan_1.DrawPrevRings(1);
    } catch (e) {
        $("#prev_1_img").attr("src", "silhouette.png");
        $(`.prev_scan_cont_1`).append(`<canvas id=\"prev_1_graph_canvas\"></canvas>`);
        $("#prev_1_time").text("N/A");
        $("#prev_1_max").text("N/A");
        $("#scan_1_cont").removeProp("value");
        console.log("No 1st Prev Scan / Err Loading 1st Prev Scan");
    }


    // Second Prev Scan
    $("#prev_2_img").prop("class", "scan_image");
    try {
        scan_2 = ALL_SCANS.get(scan_1.prev_scan);
        var max_2 = Max(scan_2.values);
        $("#prev_2_img").attr("src", scan_2.img);
        $("#prev_2_time").text(scan_2.time);
        $("#prev_2_max").text(max_2);
        $("#prev_2_img").addClass((scan_2.is_alarm) ? "alarm" : "clean");
        $("#scan_2_cont").addClass((scan_2.is_alarm) ? "alarm" : "clean");
        $("#scan_2_cont").prop("value", scan_2.id);
        scan_2.DrawPrevRings(2);
    } catch (e) {
        $("#prev_2_img").attr("src", "silhouette.png");
        $(`.prev_scan_cont_2`).append(`<canvas id=\"prev_2_graph_canvas\"></canvas>`);
        $("#prev_2_time").text("N/A");
        $("#prev_2_max").text("N/A");
        $("#scan_2_cont").removeProp("value");
        console.log("No 2nd Prev Scan / Err Loading 2nd Prev Scan");
    }
}

const Status = {
    "OFFLINE": 0,
    "STARTING": 1,
    "CONNECTED": 2,
    "RUNNING": 3,
    "ERROR": -1
}

// Return the max value in an array
function Max(arr) {
    return Math.max(...arr);
}

function Min(arr) {
    return Math.min(...arr);
}

function notFilled(id) {
    try {
        return $(`#${id}`).val().length == 0;
    } catch (e) {
        return false;
    }
}

// Pad the left side of a number
function padLeft(nr, n, str) {
    return Array(n - String(nr).length + 1).join(str || '0') + nr;
}

function padNum3(num) {
    return num.toString().padStart(3, '0');
}

function GetDate(date = new Date()) {
    return `${padLeft(date.getMonth() + 1, 2, "0")}/${padLeft(date.getDate(), 2, "0")}/${date.getFullYear()}`;
}

function GetTime(hr_24 = false, date = new Date()) {
    var hour, b = "";
    if (hr_24) {
        hour = new Date().getHours();
    }
    else {
        hour = (date.getHours() < 12) ? date.getHours() : (date.getHours() == 12) ? 12 : date.getHours() - 12;
        b = (date.getHours() >= 12) ? " PM" : " AM";
    }
    var a = [(padLeft(hour, 2, "0")), padLeft(date.getMinutes(), 2, "0"), padLeft(date.getSeconds(), 2, "0")].join(":");
    return a + b;
}

function GetCurrentTime() {
    var new_date = new Date();
    return `${GetTime(false, new_date)} ${GetDate(new_date)}`;
}

function From24to12(time) {
    time = time.match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
    time = time.slice(1);
    time[5] = +time[0] < 12 ? ' AM' : ' PM'
    time[0] = +time[0] % 12 || 12;
    return time.join('');
}
function From12to24(time) {
    var [time, modifier] = time.split(" ");

    let [hours, minutes] = time.split(":");

    if (hours === "12") {
        hours = "00";
    }

    if (modifier === "PM") {
        hours = parseInt(hours, 10) + 12;
    }

    return `${hours}:${minutes}`;
}

function Sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function Is24Hr() {
    return GetLocalStorage("24_hr_clk") == "true";
}

function CheckLocalStorage(key) {
    return window.localStorage.getItem(key) !== null;
}

function GetLocalStorage(key) {
    if (CheckLocalStorage(key))
        return window.localStorage.getItem(key);
    else
        return null;
}

function SetLocalStorage(key, val) {
    window.localStorage.setItem(key, val);
}

function ClearForms() {
    var forms = ["add_user_form", "edit_user_form", "delete_user_form"];
    for (var form_id of forms) {
        document.getElementById(form_id).reset();
    }
}

function CheckRegex(regex, val) {
    return regex.test(val);
}

function CheckIPRegex(el) {
    var valid_ip = false;
    var ip_addr = el.currentTarget.value;
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip_addr)) {
        valid_ip = true;
    }
    // try {
    //     var test_ip = el.currentTarget.value.split(".");
    //     if (test_ip.length < 4)
    //         valid_ip = false
    //     test_ip = test_ip.map(n => parseInt(n));
    //     test_ip.forEach((n, i) => {
    //         if (n < 0 || n > 255 || isNaN(n)) {
    //             valid_ip = false;
    //         }
    //     });
    // } catch (err) { }

    (valid_ip) ? $(el.currentTarget).removeClass("err_val") : $(el.currentTarget).addClass("err_val");
}

function ResetGraphs() {
    $(".canvas_container.left").empty();
    $(".canvas_container.right").empty();
    $("#graph_canvas").remove();

    var new_left_canvas = $('<canvas id="left_canvas" class="w-100"></canvas>');
    var new_right_canvas = $('<canvas id="right_canvas" class="w-100"></canvas>');

    $(".canvas_container.left").append(new_left_canvas);
    $(".canvas_container.right").append(new_right_canvas);

    var left_canvas = document.getElementById("left_canvas");
    var right_canvas = document.getElementById("right_canvas");

    var mult = 2.5;

    left_canvas.width = new_left_canvas.width() * mult;
    right_canvas.width = new_right_canvas.width() * mult;

    left_canvas.height = new_left_canvas.height() * mult;
    right_canvas.height = new_right_canvas.height() * mult;
}

function SetRegexErr(regex, el) {
    (CheckRegex(regex, el.currentTarget.value)) ? $(el.currentTarget).removeClass("err_val") : $(el.currentTarget).addClass("err_val");
}

function ValOrDefault(id, def) {
    var val = $(`#${id}`).val();
    return val.length > 0 ? val.toString() : def.toString();
}

function SplitAssist(val) {
    var splits = `${val.replace(/\s+/g, '')},`;
    splits.replace(",,", ",");
    splits = splits.split(",");
    splits.pop();
    return splits;
}

function ShowMessage(msg_title, msg_body) {
    $("#message_title").text(msg_title);
    $("#message_body").text(msg_body);
    $("#message_modal").modal("show");
    setTimeout(() => {
        $("#message_modal").modal("hide");
    }, 10000);
}

function SerialToJSON(serial) {
    var jsonObj = {};
    jQuery.map(serial, function (n, i) {
        jsonObj[n.name] = n.value;
    });

    return jsonObj;
}

function JSONToMap(json) {
    var map = new Map();
    for (var key in json) {
        map.set(key, json[key]);
    }
    return map;
}

function PlayAudio() {
    try {
        ALARM_AUDIO.play()
    }
    catch (err) {
        console.log(err);
    }
}

function DeleteAudio() {
    SOCKET.emit("delete_audio", $("#alarm_sound").val());
}

function SetReportDropdown() {
    $("#report_start").timepicker("remove");
    $("#report_end").timepicker("remove");

    $("#report_start").timepicker({
        timeFormat: Is24Hr() ? 'H:i' : 'h:i A'
    });

    $("#report_end").timepicker({
        timeFormat: Is24Hr() ? 'H:i' : 'h:i A'
    });

    $('#report_end').on('changeTime', () => {
        $('#report_start').timepicker('option', 'maxTime', $('#report_end').val());
    });

    $('#report_start').on('changeTime', () => {
        $('#report_end').timepicker('option', 'minTime', $('#report_start').val());
    });
}

function GetDayReportInput() {
    try {
        var day_val = $("#report_date").val();
        if (day_val.length == 0 || day_val == undefined) {
            ShowMessage("Date Error", "No Date input");
        }
        else if (CheckRegex(/^(0[1-9]|1[012])[/](0[1-9]|[12][0-9]|3[01])[/](19|20)\d\d$/, day_val)) {

            // Set the times from the given string values
            var start_str = notFilled("report_start") ? (Is24Hr()) ? "00:00" : "12:00 AM" : $("#report_start").val();
            var end_str = notFilled("report_end") ? (Is24Hr()) ? "23:30" : "11:30 PM" : $("#report_end").val();

            // if (!Is24Hr()) {
            //     start_str = From12to24(start_str);
            //     end_str = From12to24(end_str);
            // }

            // Set this to the Unix time
            var start_time = new Date(`${day_val} ${start_str}`).getTime() / 1000;
            var end_time = new Date(`${day_val} ${end_str}`).getTime() / 1000;

            // Check if the time periods are chronological
            if (start_time > end_time) {
                $("#report_end").addClass("err_val");
                $("#report_start").addClass("err_val");
                ShowMessage("Date Error", "Start Time After End Time");
                return null;
            } else if (start_time == end_time) {
                $("#report_end").addClass("err_val");
                $("#report_start").addClass("err_val");
                ShowMessage("Date Error", "Start and End Time are the same");
                return null;
            }
            else {
                $("#report_end").removeClass("err_val");
                $("#report_start").removeClass("err_val");
                return [day_val, start_time, end_time];
            }
        }
    } catch (err) { }
    return null;
}

function GetMonthReportInput() {
    var month_val = $("#report_month_year").val();
    if (month_val.length == 0 || month_val == undefined) {
        ShowMessage("Date Error", "No Date input");
    }
    else if (month_val.length > 0) {
        var split_year = month_val.split("/");
        return [split_year[0], split_year[1]];
    }
    else {
        return [];
    }
}

function GetDayTypeInput() {
    var type = {};

    try {
        type["content"] = $("#day_report_content").val()
        type["output"] = $("#day_report_output").val()
    }
    catch (err) {
        ShowMessage("Type Error", "Type Input Error");
    }

    return type;
}

function GetMonthTypeInput() {
    var type = {};

    try {
        type["content"] = $("#month_report_content").val()
        type["output"] = $("#month_report_output").val()
    }
    catch (err) {
        ShowMessage("Type Error", "Type Input Error");
        return null;
    }

    return type;
}

function ShowPopup(msg, is_clear = null) {
    $("#popup_msg").text(msg)
    $("#bottom_popup").removeClass("hide");
    if (is_clear == null) {
        $("#bottom_popup").addClass("none");
    }
    else if (is_clear) {
        $("#bottom_popup").addClass("clear");
    }
    else {
        $("#bottom_popup").addClass("err");
    }
    setTimeout(() => {
        $("#bottom_popup").addClass("hide");
        $("#bottom_popup").removeClass("clear");
        $("#bottom_popup").removeClass("err");
        $("#bottom_popup").removeClass("none");
    }, 5000)
}

async function StartClockTime() {
    // Set Current time
    var temp_date = new Date()
    $("#cur_date").text(GetDate(temp_date));
    $("#cur_time").text(GetTime(Is24Hr()), temp_date);

    // Wait until the next second starts + 25 ms to account for the interval start time
    await Sleep(1000 - (Date.now() % 1000) + 25);

    // Set Next Time
    temp_date = new Date()
    $("#cur_date").text(GetDate(temp_date));
    $("#cur_time").text(GetTime(Is24Hr()), temp_date);

    // Start the interval at the next second mark
    setInterval(() => {
        $("#cur_date").text(GetDate());
        $("#cur_time").text(GetTime(Is24Hr()));
    }, 1000);
}
StartClockTime();


// Server Variables
const SOCKET = io(); // The open socket to the Node.JS server

// The Current ViewScan loaded in for viewing and the camera key
var SCAN_KEY, CAM_KEY;

// If the current scanner is online
var SCANNER_ON = false;

// If the intial load has been completesd
var INIT_DAY_SCANS = false;

// Containers of Scans
var ALL_SCANS = new Map(); // The key for a scan points to a Scan Object
// ex: 1593524414 -> Scan Object

var DAY_SCANS = new Map(); // Stores arrays of scan IDs that fit within a day
// ex: 6/25/2020 -> [1593524414, 1593524414, 1593524414, 1593524414, ...]

// Storage for day's scan history
var NOT_HISTORY_VIEW = true;
var HISTORY_ALL_DAYS = [];
var HISTORY_INDEX = 0;
var HISTORY_ARR = [];

// Three most recent Scans for previous live view
var CUR_SCAN; // This is always set to visible Scan
var LAST_SCAN; // Last received Scan
var CUR_SCAN_NUM = 0;
var CUR_ALARM_NUM = 0;
var OLD_SCAN;
var ID_TO_ELEMENT = new Map();

// Alarm Audio object
var ALARM_AUDIO = new Audio("Warning.mp3");

// The scan numbers for the history view
var HIS_SCAN_NUM = 0;
var HIS_ALARM_NUM = 0;


/* Global Variables used for Admin Functions */

// Current view state (Admin Menu or Not);
var ISADMIN = false;

// Waiting for a return from the server
var PASS_SET;
var FORM_SENT = false;

// Camera alignment tool variables
var CAM_ALIGN_IMG = "";
var CAM_ALIGN_POINTS = [];
var CAM_RATIO = [];
var CANVAS_IMAGE = undefined;

var IS_DARK_MODE = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Check scan receive time, purely for statistics
var Scan_Req_Time = null;

/* Initialize any necessary DOM states and functions */
function init() {
    // Collect valid days from the DB for disabling history datepicker
    SOCKET.emit("request_valid_days");

    // Initialize the local storage
    initLocalStorage();

    // Set the color Mode
    ToggleColorMode();

    // Set functions for Navigation Buttons
    $("#history_btn").on("click", LoadHistoryPane);
    $("#report_btn").on("click", LoadReportPane);
    $("#snapshot_btn").on("click", RequestSnapshot);
    $("#logout_btn").on("click", RequestLogout);
    $("#export_btn").on("click", TakeScreenshot);
    $("#toggle_alarm").on("click", () => ToggleAlarmEvents(true));
    $("#toggle_all").on("click", () => ToggleAlarmEvents(false));
    $("#restart_viewscan").on("click", RestartScanner);

    // Repaint the Graph when the screen changes
    $(window).resize(() => {
        ViewScan(CUR_SCAN);
        if (CANVAS_IMAGE) {
            CAM_RATIO[0] = $("#align_cam_canvas").width() / CANVAS_IMAGE.width;
            CAM_RATIO[1] = $("#align_cam_canvas").height() / CANVAS_IMAGE.height;
        }
        else {
            CAM_RATIO[0] = $("#align_cam_canvas").width() / window.innerWidth;
            CAM_RATIO[1] = $("#align_cam_canvas").height() / window.innerHeight;
        }
    });
    $(window).scroll(() => {
        CAM_RATIO[0] = $("#align_cam_canvas").width() / window.innerWidth;
        CAM_RATIO[1] = $("#align_cam_canvas").height() / window.innerHeight;
    });

    // Display the graph on the visible scan
    $("#stats_btn").on("click", () => {
        $(".canvas_container").toggleClass("is_hidden");
        $("#stats_btn").toggleClass("active_btn");
    });

    // When a new date is chosen get that day's scans
    $("#history_chooser").change((e) => {
        console.log(`Getting scans for: ${$("#history_chooser").val()}`);

        // Move the loader, empty the div, move the load back
        $("#his_loader").appendTo("#elem_cont");
        $("#his_event_cont").empty();
        $("#his_loader").appendTo("#his_event_cont");

        GetDayScans($("#history_chooser").val());
    });

    $(document).on('click', () => {
        UpdateActivity();
    });

    // Clicking in the prev scan spots bring up that scan
    $(document).on("click", ".prev_scan_body", (e) => {
        try {
            if ($(e.currentTarget).prop("value") != undefined) {
                var scan_id = $(e.currentTarget).prop("value");
                CUR_SCAN = ALL_SCANS.get(scan_id);
                ViewScan(CUR_SCAN);
            }
        } catch (err) { }
    });
    // Clicking any event makes it the active event and puts it into view
    $(document).on("click", ".event", (e) => {
        $(".active_event").removeClass("active_event");
        $(e.currentTarget).addClass("active_event");

        if ($(e.currentTarget).prop("value") != undefined) {
            var scan_id = $(e.currentTarget).prop("value");
            try {
                var scan_id = $(e.currentTarget).prop("value");
                CUR_SCAN = ALL_SCANS.get(scan_id);
                ViewScan(CUR_SCAN);
            } catch (err) { }
        }
    });

    // Generation of reports
    // Day
    $("#day_report_generate").on("click", () => {
        var data = GetDayReportInput();
        if (data != null) {
            var type = GetDayTypeInput();
            var send = {
                "data": data,
                "type": type
            }
            SOCKET.emit("day_report_generate", send);
        }
    });

    // Month
    $("#month_report_generate").on("click", () => {
        var data = GetMonthReportInput();
        if (data != null) {
            var type = GetMonthTypeInput();
            var send = {
                "data": data,
                "type": type
            }
            SOCKET.emit("month_report_generate", send);
        }
    });

    // Update user choice based on scanner dropdown selection
    $(document).on("click", ".room_choice", (e) => {
        var choice = $(e.target).closest(".room_choice");
        if (SCAN_KEY != choice.prop("value")) {
            console.log(`Changing Room Selection -> ${choice.text()}`);
            SOCKET.emit("update_client_scanner", choice.prop("value"));
            // $("#room_selection").text(choice.text());
            location.reload();
        }
    });

    // Update the cookie if editing the volume/alarm enable
    $('#alarm_vol_slider').on('input', (e) => {
        var vol_val = $('#alarm_vol_slider').val();
        $('#alarm_vol').text(vol_val);
        SetLocalStorage("volume", vol_val);
        ALARM_AUDIO.volume = vol_val / 100;
    });
    $('#enable_alarm').on('change', (e) => {
        SetLocalStorage("enable_alarm", $('#enable_alarm').is(':checked'));
    });
    $("#alarm_sound").on('change', (e) => {
        ALARM_AUDIO = new Audio($("#alarm_sound").val());
        SetLocalStorage("alarm_sound", $("#alarm_sound").val());
    });
    $('#24_hr_clk').on('change', (e) => {
        SetLocalStorage("24_hr_clk", $('#24_hr_clk').is(':checked'));
        $("#cur_time").text(GetTime($('#24_hr_clk').is(':checked')));
        SetReportDropdown()
    });
    $('#mute_btn').on("click", (e) => {

        if (GetLocalStorage("enable_alarm") != null) {
            // Check state of mute in local storage
            var is_enabled = GetLocalStorage("enable_alarm") == "true";
            SetLocalStorage("enable_alarm", !is_enabled);

            // Change Audio
            $("#enable_alarm").attr("checked", !is_enabled);

            // Change Icon, and Button in options
            $("#mute_icon").removeClass()
            if (is_enabled)
                $("#mute_icon").addClass("fas fa-volume-off")
            else
                $("#mute_icon").addClass("fas fa-volume-up")
        }
        else {
            $("#enable_alarm").attr("checked", true);
            SetLocalStorage("enable_alarm", true);
        }
    })

    $("#load_more_scans").on("click", () => {
        if (OLD_SCAN != undefined) {
            let date_str = new Date().getTime();
            $("#today_loader").removeClass("is_hidden");
            $("#load_more_scans").addClass("is_hidden");
            SOCKET.emit("load_more_scans", [date_str, OLD_SCAN.id]);
        }
    });
}

function initLocalStorage() {
    if (window.localStorage.length == 0) {
        window.localStorage.setItem("volume", 100);
        window.localStorage.setItem("enable_alarm", true);
        window.localStorage.setItem("24_hr_clk", false);
    }

    $("#mute_icon").removeClass()
    if (GetLocalStorage("enable_alarm") != null) {
        if (GetLocalStorage("enable_alarm") == "true") {
            $("#mute_icon").addClass("fas fa-volume-up")
            $("#enable_alarm").attr("checked", true)
        }
        else {
            $("#mute_icon").addClass("fas fa-volume-off")
            $("#enable_alarm").attr("checked", false)
        }
    }
    else {
        $("#enable_alarm").attr("checked", true);
    }

    if (GetLocalStorage("24_hr_clk") != null) {
        $("#24_hr_clk").attr("checked", Is24Hr())
    }
    else {
        $("#24_hr_clk").attr("checked", false);
    }

    // Set the alarm audio, check if stored locally
    var alarm_file = GetLocalStorage("alarm_sound") != null ?
        GetLocalStorage("alarm_sound") : "Warning.mp3";
    ALARM_AUDIO = new Audio(alarm_file);

    $("#alarm_vol").text(GetLocalStorage("volume"));
    $("#alarm_vol_slider").val(GetLocalStorage("volume"));
}

function initRegex() {
    $("#portal_alarm_thresh").on("change", a => { SetRegexErr(/^\d+$/g, a); });

    $("#portal_gain").on("change", a => { SetRegexErr(/^(\d+,\d+:)*(\d+,\d+)?$/g, a); });

    $("#max_scan_age").on("change", a => { SetRegexErr(/\d+/g, a); });

    $("#portal_ip").on("change", a => { CheckIPRegex(a); });

    $("#cam_ip").on("input", a => {
        CheckIPRegex(a);
        $("#rtsp_url_cam_ip").text(a.currentTarget.value);
    });

    $("#cam_port").on("change", a => { SetRegexErr(/\d+/g, a); });

    $("#portal_loc").on("input", (a) => {
        $("#portal_loc").val(LocalPortalNameCheck(a.target.value));
    });

}

function initAdmin() {
    $("#settings_btn").on("click", () => { ChangeView(true); });
    $("#monitor_btn").on("click", () => { ChangeView(false); });
    $("#align_camera").on("click", AlignCamera);
    $("#restart_rtsp").on("click", RestartRTSP);


    // Require the camera settings if they're enabled
    $("#new_cam_enable").on("click", () => {
        var cam_enable = $("#new_cam_enable").is(":checked");
        $("#new_camera_ip_addr").prop("required", (cam_enable) ? "required" : "");
        if (cam_enable) {
            $("#new_camera_settings").removeClass("is_hidden");
        }
        else {
            $("#new_camera_settings").addClass("is_hidden");
        }
    });

    $("#new_camera_ip_addr").on("input", (e) => {
        $("#new_rtsp_url_ip").text($("#new_camera_ip_addr").val());
    });

    // Show the settings menu for each given section
    $(document).on("click", ".setting_choice", (e) => {
        ShowSettingsMenu($(e.target).attr("id"));
    });

    // Prevent the Add User Form from refreshing the page
    $('.modal').on('submit', (e) => {
        e.preventDefault();
    });

    // Randomize password also enables the new pass on login request
    $("#randomize_pass").on("change", () => {
        $("#new_pass_login").prop("checked", $("#randomize_pass").is(":checked"));
        if (!$("#new_pass_login").prop("checked")) {
            $("#randomize_pass").prop("checked", false);
            $("#confirm_user_pass_reset").addClass("disabled");
        } else {
            $("#confirm_user_pass_reset").removeClass("disabled");
        }
    });
    $("#new_pass_login").on("change", () => {
        if (!$("#new_pass_login").prop("checked")) {
            $("#randomize_pass").prop("checked", false);
            $("#confirm_user_pass_reset").addClass("disabled");
        } else {
            $("#confirm_user_pass_reset").removeClass("disabled");
        }
    });

    // Add user functionality
    $("#confirm_user_pass_reset").on("click", () => {
        RequestPasswordReset();
    });

    // Check the password validity on each input
    $("#add_password").on("input", (e) => {
        StartPasswordCheck(e.target.id);
    });
    $("#edit_pass_new").on("input", (e) => {
        StartPasswordCheck(e.target.id);
    });

    // Usernames can't have any spaces
    $("#add_username").on("input", (e) => {
        e.target.value = e.target.value.replace(/ /g, '');
        CheckUsernameValidity(e.target.id);
    });
    $("#edit_username").on("input", (e) => {
        e.target.value = e.target.value.replace(/ /g, '');
        CheckUsernameValidity(e.target.id);
    });

    // Check the password confirmation on each input
    $("#add_pass_conf").on("input", () => {
        $("#add_pass_conf").val() != $("#add_password").val() ? $("#add_pass_conf").addClass("err_val") : $("#add_pass_conf").removeClass("err_val");
    });

    // Enable the eyeball for each password input
    $("#edit_pass_show").on("click", (e) => {
        e = document.getElementById("edit_pass_new");
        "password" === e.type ? e.type = "text" : e.type = "password"
        $("#edit_pass_show").toggleClass("fa-eye-slash");
        $("#edit_pass_show").toggleClass("fa-eye");
    });
    $("#add_pass_show").on("click", (e) => {
        e = document.getElementById("add_password");
        "password" === e.type ? e.type = "text" : e.type = "password"
        $("#add_pass_show").toggleClass("fa-eye-slash");
        $("#add_pass_show").toggleClass("fa-eye");
    });

    // Show an example of the message
    $("#msg_subject").on("input", (e) => {
        GenerateExampleMessage();
    });
    $("#msg_body").on("input", (e) => {
        GenerateExampleMessage();
    });
    $("#tcp_msg").on("input", (e) => {
        GenerateExampleMessage();
    });

    // Lock or unlock an account
    $("#confirm_lock_acct").on("click", (e) => {
        SOCKET.emit("account_lock", [$("#lock_acct_name").prop("value")[2], true])
        setTimeout(() => {
            ReloadUserTable();
        }, 250);
    });
    $("#confirm_unlock_acct").on("click", (e) => {
        SOCKET.emit("account_lock", [$("#lock_acct_name").prop("value")[2], false])
        setTimeout(() => {
            ReloadUserTable();
        }, 250);
    });

    $("#email_scan_type").on("change", () => { GenerateExampleMessage() });

    // Add an audio file to the warning system
    $("#select_audio").on("change", (e) => {
        var audio = document.createElement('audio');
        var source = document.getElementById("select_audio");

        // Check the given sound file length
        if (source.files.length > 0) {
            var file = source.files[0];
            var reader = new FileReader();
            reader.onload = function (e) {

                audio.src = e.target.result;
                audio.addEventListener('loadedmetadata', function () {
                    // Load the duration and print it
                    var duration = audio.duration;
                    var dur_rounded = Math.floor(duration * 100) / 100;
                    $("#input_audio_length").text(dur_rounded);

                    // If the sound bite is < 2 seconds then allow it to be submitted
                    if (dur_rounded < 2) {
                        $("#upload_audio").removeClass("disabled");
                    }
                    else {
                        $("#upload_audio").addClass("disabled");
                    }
                }, false);
            };
            reader.readAsDataURL(file);
        }
    });
    $("#upload_audio").on("click", () => {
        var source = document.getElementById("select_audio");
        var file = source.files[0];
        var reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            var audio_buf = e.target.result;
            var data = {
                "buffer": audio_buf,
                "filename": file.name
            }
            SOCKET.emit("send_audio_data", data);
        };
        // Once uploaded request the sound files again
        setTimeout(() => { SOCKET.emit("request_sound_settings") }, 1500);
    });


    // License Upload Events
    $("#select_license").on("change", (e) => {
        $("#upload_license").removeClass("disabled");
    });
    $("#upload_license").on("click", () => {
        var source = document.getElementById("select_license");
        var file = source.files[0];
        var reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            var license_buf = e.target.result;
            var data = {
                "buffer": license_buf,
                "filename": file.name
            }
            SOCKET.emit("send_license_data", data);
            $("#upload_license").addClass("disabled");
            source.value = "";
        };
    });

    // Preset value for warped corners if they don't already exist
    $("#portal_warp_corners").val("[[1,2],[3,4],[5,6],[7,8]]");

    // Preset for finding IPs
    $("#scan_ip_range").val(`${location.hostname.split(".").slice(0, -1).join(".")}.*`);

    // $("#open_p8221_modal").on("click", () => {
    //     $("#p8221_modal").modal("show");
    // });
}

function initSocket() {
    SOCKET.on('disconnect', () => {
        // Reload the page in the event of a disconnect
        ShowMessage("Server Lost", "Connection To Server has been Lost.\nPlease Refresh or Check Connection.");
        setTimeout(() => {
            location.reload();
        }, 15000);
    });

    SOCKET.on("eula_accept", (data) => {
        if (!data[0]) {
            $("body").append($(data[1]));
        }
    });

    SOCKET.on("force_reset_password", (data) => {
        if (data[0]) {
            $("body").append($(data[1]));
        }
    });

    SOCKET.on("license_check", (data) => {
        if (!data[0]) {
            $("#settings_btn").off();
            $("#nav_header").empty()
            var no_license = $(`<h3 class=\"offline\">${data[2]}</h3>`)
            $("#nav_header").append(no_license)
            $("body").append($(data[1]));
        }
    });

    SOCKET.on("temp_license_check", (data) => {
        var days = data[0];
        if (days != -1) {
            $("#temp_lic_days").text(`${days} ${(days == 1) ? "Day" : "Days"}`);
            $("#temp_lic_days_header").removeClass("is_hidden");
        }
        else {
            $("#temp_lic_days_header").remove();
            // $("#license_settings").remove();
        }
    });

    SOCKET.on("set_cur_key", (key) => {
        SCAN_KEY = key;
    });

    SOCKET.on("init_scanner_dropdown", (data) => {
        data[0].forEach((s, index) => {
            InsertScanner(s, data[1]);
        });
        SOCKET.emit("request_scanners_status");
    });

    // The status of the currently viewed scanner
    SOCKET.on("device_status_receive", (status) => {
        $("#portal_status").removeClass().addClass("fa fa-circle mr-2");
        $("#camera_status").removeClass().addClass("fa fa-circle mr-2");

        var prt_stat = status.portal;
        var cam_stat = status.camera;

        $("#portal_status").addClass((prt_stat == Status.OFFLINE) ?
            "offline" : ((prt_stat == Status.STARTING) ? "starting" : "connected"));
        $("#camera_status").addClass((cam_stat == Status.OFFLINE) ?
            "offline" : ((cam_stat == Status.STARTING) ? "starting" : "connected"));

        SCANNER_ON = (prt_stat == Status.CONNECTED);

        if (SCANNER_ON)
            $("#snapshot_btn").removeAttr("disabled");

        TogglePortalButtons();
    });

    // The status of each unique scanner including the currently viewed one
    SOCKET.on("get_scanners_status", (data) => {
        for (var key in data) {
            var portal_str = `${key}_portal_status`;
            var camera_str = `${key}_camera_status`;

            var status = data[key];
            var prt_stat = status.portal;
            var cam_stat = status.camera;

            $(`#${portal_str}`).removeClass();
            $(`#${camera_str}`).removeClass();

            $(`#${portal_str}`).addClass("fa fa-circle mr-2");
            $(`#${camera_str}`).addClass("fa fa-circle mr-2");

            $(`#${portal_str}`).addClass((prt_stat == Status.OFFLINE) ?
                "offline" : ((prt_stat == Status.STARTING) ? "starting" : "connected"));
            $(`#${camera_str}`).addClass((cam_stat == Status.OFFLINE) ?
                "offline" : ((cam_stat == Status.STARTING) ? "starting" : "connected"));

            // If the key matches the visible portal then display its connectivity

            if (key === SCAN_KEY) {
                $(`#portal_status`).removeClass();
                $("#camera_status").removeClass();

                $(`#portal_status`).addClass("fa fa-circle mr-2");
                $(`#camera_status`).addClass("fa fa-circle mr-2");

                $("#portal_status").addClass((prt_stat == Status.OFFLINE) ?
                    "offline" : ((prt_stat == Status.STARTING) ? "starting" : "connected"));
                $("#camera_status").addClass((cam_stat == Status.OFFLINE) ?
                    "offline" : ((cam_stat == Status.STARTING) ? "starting" : "connected"));
                SCANNER_ON = (prt_stat == Status.CONNECTED);
                if (SCANNER_ON)
                    $("#snapshot_btn").removeAttr("disabled");
                TogglePortalButtons();
            }
        }
    });

    SOCKET.on("get_rtsp_status", (stats) => {
        $("#rtsp_status").removeClass().addClass("fa fa-circle mr-2").addClass((stats == Status.OFFLINE) ?
            "offline" : ((stats == Status.STARTING) ? "starting" : "connected"));
    });

    SOCKET.on("scan_in_progress", () => {
        $("#snapshot_btn").attr("disabled", "disabled");
        $("#snapshot_btn").addClass("is_hidden");
        $("#snapshot_loader").removeClass("is_hidden")
        // Change the title to show the event in action
        // document.title = "ViewScan - Scan In Progress";
        setTimeout(() => {
            // Change the title back to initial state
            // document.title = "ViewScan";
            $("#snapshot_btn").removeClass("is_hidden");
            $("#snapshot_loader").addClass("is_hidden");
        }, 1500);
    });

    SOCKET.on("sound_files_receive", (data) => {
        PopulateSoundData(data);
    });

    SOCKET.on("no_active_scanner", ToggleNoScanner);
    SOCKET.on("scan_err_result", ToggleNoScanner);

    SOCKET.on("new_scan_receive", (scan_json) => {
        console.log(`New Scan Received\nTotal Scan Time: ${(new Date().getTime() - Scan_Req_Time) / 1000}s`);
        var new_scan = new Scan(JSON.parse(scan_json));
        new_scan.prev_scan = LAST_SCAN ? LAST_SCAN.id : undefined;
        LAST_SCAN = new_scan;

        if (document.visibilityState === 'hidden') {
            document.title = (new_scan.is_alarm) ? "Alarm Scan Detected ❗" : "New Scan Detected ❗";
        }
        else {
            document.title = "ViewScan";
        }

        $("#snapshot_loader").addClass("is_hidden");
        $("#snapshot_btn").removeClass("is_hidden");
        $("#snapshot_btn").removeAttr("disabled");
        $(".active_event").removeClass("active_event");

        CUR_SCAN = new_scan;
        // Increment the new scan counter
        CUR_SCAN_NUM++;
        if (new_scan.is_alarm) {
            CUR_ALARM_NUM++;
        }

        if ($("#his_event_cont").hasClass("is_hidden")) {
            ViewScan(CUR_SCAN);
            CUR_SCAN.LoadAlarm();
            $("#total_scans").text(isNaN(CUR_SCAN_NUM) ? 0 : CUR_SCAN_NUM);
            $("#total_alarms").text(isNaN(CUR_ALARM_NUM) ? 0 : CUR_ALARM_NUM);
        }

        // Change the title back to initial state
        // document.title = "ViewScan";

        // Add this event to the lists
        CreateEvent(new_scan, "today_event_cont", "alarm_events");
    });

    SOCKET.on("day_scan_receive", (scan_rows) => {
        if (scan_rows.length < 1) {
            $("#today_loader").addClass("is_hidden");
            $("#his_loader").addClass("is_hidden");
            $(".history_scan_container").removeClass("is_hidden");
            INIT_DAY_SCANS = true;
            return;
        } else {
            // Load events into current history array / Save new scans
            HISTORY_ARR = [], HISTORY_INDEX = 0, HIS_ALARM_NUM = 0, HIS_SCAN_NUM = 0;

            for (row in scan_rows) {
                let data = scan_rows[row];
                HISTORY_ARR.push(data.scan_id);
                var scan = null;

                if (!ALL_SCANS.has(data.scan_id)) {
                    scan = new Scan(data);
                    if (row > 0) {
                        // Sets the prev and next scan id for the appropriate scans
                        scan.prev_scan = [...ALL_SCANS][ALL_SCANS.size - 2][1].id;
                        [...ALL_SCANS][ALL_SCANS.size - 2][1].next_scan = scan.id;
                    }
                } else {
                    console.log("Scan is already in local storage");
                    scan = ALL_SCANS.get(data.scan_id);
                }

                if (!INIT_DAY_SCANS) {
                    if (OLD_SCAN == null || OLD_SCAN == undefined) {
                        OLD_SCAN = scan;
                    }
                    else {
                        if (OLD_SCAN.id > scan.id) {
                            OLD_SCAN = scan;
                        }
                    }
                }

                INIT_DAY_SCANS ? CreateEvent(scan, "his_event_cont", "his_alarm_events") :
                    CreateEvent(scan, "today_event_cont", "alarm_events");

                if (scan.is_alarm) {
                    HIS_ALARM_NUM++;
                }

                if (row == scan_rows.length - 1) {
                    // Load in the most recent scan
                    if (!INIT_DAY_SCANS) {
                        // If it's the intial request then view the most recent 3
                        CUR_SCAN = null;
                        try {
                            CUR_SCAN = ALL_SCANS.get(HISTORY_ARR[row]);
                            LAST_SCAN = CUR_SCAN;
                        } catch (e) {
                            console.log("No Current Scan Error");
                        }
                        if (NOT_HISTORY_VIEW) {
                            ViewScan(CUR_SCAN);
                        }
                    } else {
                        if (!NOT_HISTORY_VIEW) {
                            // Otherwise view the first of the list
                            ViewScan(ALL_SCANS.get(HISTORY_ARR[0]));
                        }
                    }
                }
            }
            console.log(`History Receive Time: ${(((new Date().getTime()) - HISTORY_REQ_TIME) / 1000).toFixed(2)}`);


            // Set the history index
            // if it's the initial day then we don't want to apply
            if (!INIT_DAY_SCANS) {
                $("#today_loader").addClass("is_hidden");
                CUR_ALARM_NUM = HIS_ALARM_NUM;
                CUR_SCAN_NUM = scan_rows.length;
            }

            HIS_SCAN_NUM = scan_rows.length;
            $("#total_scans").text(HIS_SCAN_NUM);
            $("#total_alarms").text(HIS_ALARM_NUM);

            INIT_DAY_SCANS = true;
        }

        $("#his_loader").addClass("is_hidden");
        $(".history_scan_container").removeClass("is_hidden");
        NOT_HISTORY_VIEW = !$("#history_btn").hasClass("active_btn");
    });

    SOCKET.on("load_more_receive", (scan_rows) => {
        $("#today_loader").addClass("is_hidden");
        $("#load_more_scans").removeClass("is_hidden");
        if (scan_rows.length < 50) {
            $("#load_more_scans").remove()
        }
        for (var row = scan_rows.length - 1; row >= 0; row--) {
            let data = scan_rows[row];
            var scan = null;

            if (!ALL_SCANS.has(data.scan_id)) {
                scan = new Scan(data);
                scan.next_scan = OLD_SCAN.id;
                OLD_SCAN.prev_scan = scan.id;
                OLD_SCAN = scan;

            } else {
                console.log("Scan is already in local storage");
                scan = ALL_SCANS.get(data.scan_id);
            }

            CreateEvent(scan, "today_event_cont", "alarm_events", true);

            CUR_SCAN_NUM++;
            if (scan.is_alarm) {
                CUR_ALARM_NUM++;
            }

        }
        $("#total_scans").text(isNaN(CUR_SCAN_NUM) ? 0 : CUR_SCAN_NUM);
        $("#total_alarms").text(isNaN(CUR_ALARM_NUM) ? 0 : CUR_ALARM_NUM);
        ViewScan(CUR_SCAN);
    });

    SOCKET.on("check_more_receive", (check) => {
        if (check) {
            $("#load_more_scans").removeClass("is_hidden");
        }
    });

    SOCKET.on("valid_days_receive", (day_rows) => {
        var valid_dates = [];
        var valid_months = [];
        for (var day of day_rows.array) {
            HISTORY_ALL_DAYS.push(day);
            valid_dates.push(day);

            var date_split = day.split("/");
            var month = [date_split[0], date_split[2]].join("/")
            if (!(valid_months.includes(month))) {
                valid_months.push(month);
            }
        }
        HISTORY_ALL_DAYS.sort();

        // Initialize two date pickers for the history and report

        $("#history_chooser").datepicker({
            beforeShowDay: (date) => {
                var temp_day = padLeft(date.getDate(), 2, "0");
                var temp_month = padLeft(date.getMonth() + 1, 2, "0");
                var temp_year = date.getFullYear();
                var temp_date = [temp_month, temp_day, temp_year].join("/");
                if (valid_dates.includes(temp_date)) {
                    return [true, ''];
                }
                return [false, ''];
            }
        });


        $("#report_date").datepicker({
            beforeShowDay: (date) => {
                var temp_day = padLeft(date.getDate(), 2, "0");
                var temp_month = padLeft(date.getMonth() + 1, 2, "0");
                var temp_year = date.getFullYear();
                var temp_date = [temp_month, temp_day, temp_year].join("/");
                if (valid_dates.includes(temp_date)) {
                    return [true, ''];
                }
                return [false, ''];
            }
        });

        $('#report_month_year').MonthPicker({
            ShowIcon: false,
            beforeShowMonth: (date) => {
                var temp_month = padLeft(date.getMonth() + 1, 2, "0");
                var temp_year = date.getFullYear();
                var temp_date = [temp_month, temp_year].join("/");
                if (valid_months.includes(temp_date)) {
                    return [true, ''];
                }
                return [false, ''];
            }
        });

        SetReportDropdown();
    });

    SOCKET.on("report_receive", (pdf_base64) => {
        // Base 64 to PDF conversion
        for (var e = pdf_base64, a = atob(e.replace(/\s/g, "")), n = a.length, r = new ArrayBuffer(n), o = new Uint8Array(r), t = 0; t < n; t++) o[t] = a.charCodeAt(t);

        // Generation of PDF blob
        var p = new Blob([o], {
            type: "application/pdf"
        });

        // URL creation of PDF blob
        c = URL.createObjectURL(p);
        window.open(c);
    });

    SOCKET.on("csv_receive", (data) => {
        // Base 64 to CSV string conversion
        try {
            let output = atob(data["csv_data"]);

            var hidden_elem = document.createElement('a');
            hidden_elem.href = 'data:text/csv;charset=utf-8,' + encodeURI(output);
            hidden_elem.target = '_blank';
            hidden_elem.download = `${data["csv_name"]}.csv`;
            hidden_elem.click();
        }
        catch (err) {
            ShowMessage("Error Downloading File", "There was an error transcoding the CSV file")
        }
    });

    SOCKET.on("logout_reply", () => {
        window.location.href = window.location.origin;
    });

    SOCKET.on("message_receive", (msg) => {
        ShowMessage(msg[0], msg[1]);
    });



    /* Get the Scanner Status */
    CheckDeviceStatus();
    SOCKET.emit("connected");



    // Admin Socket Settings
    SOCKET.on("all_users_receive", (user_rows) => {
        user_rows.forEach((user) => {
            AddUserToTable(user.name, user.username, user.id, user.creation, user.last_edit, user.permissions, user.lock);
        });
    });

    SOCKET.on("scanner_settings_receive", (data) => {
        PopulatePortalSettings(data);
    });

    SOCKET.on("notif_settings_receive", (data) => {
        PopulateNotificationSettings(data);
    });

    SOCKET.on("cam_settings_receive", (data) => {
        if (data.length < 1) {
            return;
        }
        PopulateCameraSettings(data);
    });

    SOCKET.on("security_settings_receive", (data) => {
        PopulateSecuritySettings(data);
    });

    SOCKET.on("rtsp_settings_receive", (data) => {
        PopulateRTSPSettings(data);
    });

    SOCKET.on("p8221_settings_receive", (data) => {
        if (data.length < 1) {
            return;
        }
        PopulateP8221Settings(data);
    });

    SOCKET.on("update_user_table", () => {
        $("#user_table_body").empty();
        SOCKET.emit("request_all_user_info");
    });

    SOCKET.on("update_portal_table", () => {
        $("#portals_table_body").empty();
        SOCKET.emit("request_scanners");
    });

    SOCKET.on("save_in_progress", () => {
        $('.save_btn').each(function (i, obj) {
            $(`#${obj.id}`).addClass("disabled");
        });
    });

    SOCKET.on("save_complete", () => {
        var display_btn = setTimeout(() => {
            $('.save_btn').each(function (i, obj) {
                $(`#${obj.id}`).removeClass("disabled");
                TogglePortalButtons();
            });
        }, 1500);
    });

    SOCKET.on("ip_cam_frame_receive", (data) => {
        initCanvas();
        // Replace the current image canvas

        // Add on-click events to the canvas
        var canvas = document.getElementById("align_cam_canvas");

        // Set the image attributes
        var image = new Image();
        image.onload = () => {
            // Change the menus
            $("#align_cam_loader").addClass("is_hidden");

            // CAM_RATIO = $("#align_cam_canvas").width() / image.width;
            CANVAS_IMAGE = image;

            // Set the dimensions
            canvas.width = image.width;
            canvas.height = image.height;

            // Size if horizontal or vertical
            if (image.width > image.height) {
                $("#align_cam_canvas").width("50vw");
                $("#align_cam_canvas").height("auto");
            }
            else {
                $("#align_cam_canvas").width("auto");
                $("#align_cam_canvas").height("75vh");
            }

            circ_width = [.15 * CANVAS_IMAGE.width, .85 * CANVAS_IMAGE.width];
            circ_height = [.25 * CANVAS_IMAGE.height, .75 * CANVAS_IMAGE.height];

            WARP_POINTS.push(new Point(1, circ_width[0], circ_height[0]));
            WARP_POINTS.push(new Point(2, circ_width[1], circ_height[0]));
            WARP_POINTS.push(new Point(3, circ_width[1], circ_height[1]));
            WARP_POINTS.push(new Point(4, circ_width[0], circ_height[1]));

            CAM_RATIO[0] = $("#align_cam_canvas").width() / CANVAS_IMAGE.width;
            CAM_RATIO[1] = $("#align_cam_canvas").height() / CANVAS_IMAGE.height;

            var points = [];
            for (circ of WARP_POINTS) {
                points.push([parseInt(circ.x), parseInt(circ.y)]);
            }
            $("#align_points").text(JSON.stringify(points));

            // Draw on the image
            canvas.getContext("2d").drawImage(image, 0, 0);
            DrawCircles();
        };
        CAM_ALIGN_IMG = data;
        image.src = data;
    });

    SOCKET.on("enable_test_notif", () => {
        $("#send_test_notif").removeClass("disabled");
    })

    SOCKET.on("enable_rtsp_reset", () => {
        $("#submit_edit_rtsp").removeClass("disabled");
        ToggleRestartRTSP();
    });

    SOCKET.on("disable_rtsp_reset", () => {
        $("#submit_edit_rtsp").addClass("disabled");
        $("#restart_rtsp").addClass("disabled");
    });

    SOCKET.on("found_network_scanners", (data) => {
        $("#seach_scanner_loader").addClass("is_hidden");
        if (data != null) {
            $("#seach_scanner_loader").addClass("is_hidden");
            $("#scanners_present").text(`${data.length} scanner(s) found`);
            for (var scanner of data) {
                AddNetworkScannerToTable(scanner[0]);
            }
        }
    });

    /* Load Other Settings */
    SOCKET.emit("request_alarm_sounds");
    SOCKET.emit("request_security_settings");
    SOCKET.emit("request_rtsp_settings");
    // SOCKET.emit("request_p8221_settings");
}

function initTable() {
    // Show the edit form when clicked
    $(document).on("click", ".edit", (e) => ShowEditUser(e.target));

    // Prompt the admin to confirm deletion
    $(document).on("click", ".delete_user", (e) => {
        ClearForms();
        ShowDeleteUser(e);
    });

    $(document).on("click", ".delete_portal", (e) => {
        ClearForms();
        ShowDeletePortal(e);
    });

    $(document).on("click", ".lock", (e) => {
        ShowLockMenu(e.target, true);
    });
    $(document).on("click", ".unlock", (e) => {
        ShowLockMenu(e.target, false);
    });

    $(document).on("click", ".pass_menu", (e) => {
        ShowPassMenu(e.target);
    });

    $(document).on('visibilitychange', () => {
        if (document.visibilityState === "visible") {
            document.title = "ViewScan";
        }
    })


    $("#submit_edit_user").on("click", () => {
        var cur_time = GetCurrentTime(false);
        $("#edit_user_modal").modal("hide");
        EditUserInDB($("#edit_name").val(), $("#edit_username").val(), $("#edit_id").val(), $("#edit_password").val(), $("#edit_pass_new").val(), cur_time, $("#edit_permission").val());
        ClearForms();
    });

    $("#submit_cam_align").on("click", () => {
        // Make all the pixel counts base 10 integers otherwise you'll have irrational decimals
        // for (var i in CAM_ALIGN_POINTS) {
        //     for (var b in CAM_ALIGN_POINTS[i]) {
        //         CAM_ALIGN_POINTS[i][b] = parseInt(CAM_ALIGN_POINTS[i][b], 10);
        //     }
        // }
        var points = [];
        for (circ of WARP_POINTS) {
            points.push([parseInt(circ.x), parseInt(circ.y)]);
        }
        $("#portal_warp_corners").val(JSON.stringify(points));
    });

    $("#reset_cam_align").on("click", () => {
        CAM_ALIGN_POINTS = [];
        // $("#align_points").text("No Points Clicked");
        WARP_POINTS = [];
        circ_width = [.15 * CANVAS_IMAGE.width, .85 * CANVAS_IMAGE.width];
        circ_height = [.25 * CANVAS_IMAGE.height, .75 * CANVAS_IMAGE.height];

        WARP_POINTS.push(new Point(1, circ_width[0], circ_height[0]));
        WARP_POINTS.push(new Point(2, circ_width[1], circ_height[0]));
        WARP_POINTS.push(new Point(3, circ_width[1], circ_height[1]));
        WARP_POINTS.push(new Point(4, circ_width[0], circ_height[1]));

        CAM_RATIO[0] = $("#align_cam_canvas").width() / CANVAS_IMAGE.width;
        CAM_RATIO[1] = $("#align_cam_canvas").height() / CANVAS_IMAGE.height;

        var points = [];
        for (circ of WARP_POINTS) {
            points.push([parseInt(circ.x), parseInt(circ.y)]);
        }
        $("#align_points").text(JSON.stringify(points));

        DrawCircles();
    });

    // $(document).on("click", "#align_cam_canvas", (e) => {
    //     var canvas = document.getElementById("align_cam_canvas");
    //     var ctx = canvas.getContext("2d");
    //     ctx.fillStyle = "#f58a48";
    //     ctx.strokeStyle = "#f58a48";
    //     ctx.lineWidth = 5;

    //     var rect = canvas.getBoundingClientRect();
    //     var x = (e.clientX - rect.left) / CAM_RATIO[0],
    //         y = (e.clientY - rect.top) / CAM_RATIO[1];

    //     if (CAM_ALIGN_POINTS.length < 4) {
    //         CAM_ALIGN_POINTS.push([x, y]);
    //         for (var i in CAM_ALIGN_POINTS) {
    //             for (var b in CAM_ALIGN_POINTS[i]) {
    //                 CAM_ALIGN_POINTS[i][b] = parseInt(CAM_ALIGN_POINTS[i][b], 10);
    //             }
    //         }
    //         $("#align_points").text(JSON.stringify(CAM_ALIGN_POINTS));
    //         cam_length = CAM_ALIGN_POINTS.length;
    //         if (cam_length > 1) {
    //             // Draw next line
    //             var start = CAM_ALIGN_POINTS[cam_length - 1];
    //             var end = CAM_ALIGN_POINTS[cam_length - 2];
    //             ctx.beginPath();
    //             ctx.moveTo(start[0], start[1]);
    //             ctx.lineTo(end[0], end[1]);
    //             ctx.stroke();

    //             // Connect last and first
    //             if (cam_length == 4) {
    //                 var start = CAM_ALIGN_POINTS[3];
    //                 var end = CAM_ALIGN_POINTS[0];
    //                 ctx.beginPath();
    //                 ctx.moveTo(start[0], start[1]);
    //                 ctx.lineTo(end[0], end[1]);
    //                 ctx.stroke();

    //                 // Enable the submit button
    //                 $("#submit_cam_align").removeClass("disabled");
    //             }
    //         }
    //         ctx.beginPath();
    //         ctx.arc(x, y, 3, 0, Math.PI * 2, true);
    //         ctx.fill();
    //     }
    // });

    // Once the table is init then load in user information
    GetUserInfo();
    GetScanners();

    // Reload window after 24 hours
    setInterval(() => {
        location.reload();
    }, 86400000);
}

class Point {
    constructor(num, x, y) {
        this.num = num;
        this.x = x;
        this.y = y;
        this.radius = std_radius;
    }

}
function PointOnSegment(p, q, m) {
    if (q.x <= Math.max(p.x, m.x) && q.x >= Math.min(p.x, m.x) &&
        q.y <= Math.max(p.y, m.y) && q.y >= Math.min(p.y, m.y))
        return true;

    return false;
}
function GetCollinearity(p, q, m) {
    var val = (q.y - p.y) * (m.x - q.x) -
        (q.x - p.x) * (m.y - q.y);
    if (val == 0) return 0;
    return (val > 0) ? 1 : 2;
}
function CheckPointsIntersect(p1, p2, p3, p4) {
    var o1 = GetCollinearity(p1, p2, p3);
    var o2 = GetCollinearity(p1, p2, p4);
    var o3 = GetCollinearity(p3, p4, p1);
    var o4 = GetCollinearity(p3, p4, p2);

    if (o1 + o2 + o3 + o4 == 0.0)
        return false;

    if ((o1 != o2 && o3 != o4) ||
        (o1 == 0 && PointOnSegment(p1, p3, p2)) ||
        (o2 == 0 && PointOnSegment(p1, p4, p2)) ||
        (o3 == 0 && PointOnSegment(p3, p1, p4)) ||
        (o4 == 0 && PointOnSegment(p3, p2, p4)))
        return true;

    return false;
}
function CheckPointsDisordered(p1, p2, p3, p4) {
    return (p1.x > p3.x && p1.y > p3.y) ||
        (p2.x < p4.x && p2.y > p4.y) ||
        (p3.x < p1.x && p3.y < p1.y) ||
        (p4.x > p2.x && p4.y < p2.y);
}
function CheckPointIssues(p1, p2, p3, p4) {
    if (CheckPointsDisordered(p1, p2, p3, p4))
        return true;
    if (CheckPointsIntersect(p1, p2, p3, p4))
        return true;
    if (CheckPointsIntersect(p2, p3, p4, p1))
        return true;
    return false;
}
var WARP_POINTS = [];
var is_mouse_down = false;
var last_x;
var last_y;
var std_radius = 15;

function DrawCircles() {
    var canvas = document.getElementById("align_cam_canvas");
    var ctx = canvas.getContext("2d");
    var prev_circle = null;
    segments_disordered = CheckPointIssues(WARP_POINTS[0], WARP_POINTS[1], WARP_POINTS[2], WARP_POINTS[3]);
    ctx.fillStyle = (segments_disordered) ? "red" : "#F58A48";
    ctx.strokeStyle = (segments_disordered) ? "red" : "#F58A48";
    ctx.font = 'bold 64px serif';

    if (segments_disordered)
        $("#submit_cam_align").addClass("disabled");
    else
        $("#submit_cam_align").removeClass("disabled");

    var image = new Image();
    var canvas = document.getElementById("align_cam_canvas");
    image.onload = () => {
        canvas.getContext("2d").drawImage(image, 0, 0);
        for (var i = 0; i < WARP_POINTS.length; i++) {
            var circle = WARP_POINTS[i];
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            ctx.fillText(circle.num, circle.x + 20, circle.y - 10);
            ctx.closePath();
            ctx.lineWidth = 2;
            ctx.stroke();
            if (prev_circle != null) {
                ctx.beginPath();
                ctx.moveTo(prev_circle.x, prev_circle.y);
                ctx.lineTo(circle.x, circle.y);
                ctx.lineWidth = 5;
                ctx.stroke();
            }
            prev_circle = circle;
        }

        ctx.beginPath();
        ctx.moveTo(prev_circle.x, prev_circle.y);
        ctx.lineTo(WARP_POINTS[0].x, WARP_POINTS[0].y);
        ctx.lineWidth = 5;
        ctx.stroke();
        var points = [];
        for (circ of WARP_POINTS) {
            points.push([parseInt(circ.x), parseInt(circ.y)]);
        }
        $("#align_points").text(JSON.stringify(points));
    };
    image.src = CAM_ALIGN_IMG;
}

function initCanvas() {
    var canvas = document.getElementById("align_cam_canvas");

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#F58A48";
    ctx.strokeStyle = "#F58A48";
    ctx.lineWidth = 5;

    // listen for mouse events
    $("#align_cam_canvas").mousedown(function (e) {

        // tell the browser we'll handle this event
        e.preventDefault();
        e.stopPropagation();

        // save the mouse position
        // in case this becomes a drag operation
        var rect = canvas.getBoundingClientRect();
        last_x = (e.clientX - rect.left) / CAM_RATIO[0];
        last_y = (e.clientY - rect.top) / CAM_RATIO[1];

        // hit test all existing WARP_POINTS
        var hit = -1;
        for (var i = 0; i < WARP_POINTS.length; i++) {
            var circle = WARP_POINTS[i];
            var dx = last_x - circle.x;
            var dy = last_y - circle.y;
            if (dx * dx + dy * dy < Math.pow(circle.radius, 2)) {
                hit = i;
            }
        }

        // if no hits then add a circle
        // if hit then set the is_mouse_down flag to start a drag
        if (hit >= 0) {
            draggingCircle = WARP_POINTS[hit];
            is_mouse_down = true;
        }
    });
    $("#align_cam_canvas").mousemove(function (e) {

        // if we're not dragging, just exit
        if (!is_mouse_down) {
            return;
        }

        // tell the browser we'll handle this event
        e.preventDefault();
        e.stopPropagation();

        // get the current mouse position
        var rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / CAM_RATIO[0];
        mouseY = (e.clientY - rect.top) / CAM_RATIO[1];

        // calculate how far the mouse has moved
        // since the last mousemove event was processed
        var dx = mouseX - last_x;
        var dy = mouseY - last_y;

        // reset the last_x/Y to the current mouse position
        last_x = mouseX;
        last_y = mouseY;

        // change the target WARP_POINTS position by the
        // distance the mouse has moved since the last
        // mousemove event
        draggingCircle.x += parseInt(dx);
        draggingCircle.y += parseInt(dy);

        var points = [];
        for (circ of WARP_POINTS) {
            points.push([parseInt(circ.x), parseInt(circ.y)]);
        }
        $("#align_points").text(JSON.stringify(points));

        // redraw all the WARP_POINTS
        DrawCircles();
    });
    $("#align_cam_canvas").mouseup(function (e) {
        // tell the browser we'll handle this event
        e.preventDefault();
        e.stopPropagation();

        // stop the drag
        is_mouse_down = false;
    });
    $("#align_cam_canvas").mouseout(function (e) {
        // tell the browser we'll handle this event
        e.preventDefault();
        e.stopPropagation();

        // stop the drag
        is_mouse_down = false;
    });
}

/* User Account Functions */
function ShowEditUser(e) {
    $("#edit_user_modal").modal("show");
    var values = $(e).parent().parent().prop("value");
    $("#edit_id").val(values[2]);
    $("#edit_name").val(values[0]);
    $("#edit_username").val(values[1]);
    $("#edit_permission").val(values[3]);
    (values[1] == "admin") ? $("#edit_name").attr("disabled", "disabled") : $("#edit_name").removeAttr("disabled");
    (values[1] == "admin") ? $("#edit_username").attr("disabled", "disabled") : $("#edit_username").removeAttr("disabled");

}

function ShowDeleteUser(e) {
    $("#delete_user_modal").modal("show");
    var values = $(e.target).parent().parent().prop("value");
    $("#delete_user_header").text(values[1]);
    $("#delete_user_header").prop("value", values[2]);
}

function EditUserInDB(name, username, id, pass, new_pass, edit_time, permission) {
    var data = {
        "name": name,
        "username": username,
        "id": id,
        "pass": pass,
        "new_pass": new_pass,
        "last_edit": edit_time,
        "perm": permission
    }
    SOCKET.emit("request_edit_user", data);
}

function AddUserToTable(name, username, id, creation, user_edited, permission, is_locked) {
    var actions = `<a class="edit mr-3"><i class="fas fa-edit"></i></a>`;

    // Check if the user acct. is locked or not
    actions += (username == "admin") ? "" : (is_locked) ? `<a class="lock mr-3"><i class="fas fa-lock"></i></a>` : `<a class="unlock mr-3"><i class="fas fa-unlock"></i></a>`;
    actions += (username == "admin") ? "" : `<a class="pass_menu"><i class="fas fa-key mr-3"></i></a>`;

    // This is for show, the admin account can't be deleted even on the server side
    actions += (name == "admin") ? "" : `<a class="delete_user"><i class="fas fa-trash-alt"></i></a>`;

    var perm_string = (permission == 1) ? "Admin" : (permission == 0) ? "User" : "Viewer";

    var actions_col = $(`<td class="actions text-center">` + actions + `</td>`);
    actions_col.prop("value", [name, username, id, permission]);

    var row = $("<tr></tr>");
    row.append(`<td>${name}</td>`);
    row.append(`<td>${username}</td>`);
    row.append(`<td>${id}</td>`);
    row.append(`<td>${creation}</td>`);
    row.append(`<td>${user_edited}</td>`);
    row.append(`<td>${perm_string}</td>`);
    row.append(actions_col);

    $("#user_table").append(row);
}

function ReloadUserTable() {
    $("#user_table_body").empty();
    GetUserInfo();
}

function ShowDeletePortal(e) {
    $(".active_portal_row").removeClass("active_portal_row");
    $(e.target).parent().parent().parent().addClass("active_portal_row");

    var values = $(e.target).parent().parent().prop("value");
    $("#delete_portal_header").text(values[0]);

    $("#delete_portal_modal").modal("show");

    $("#delete_portal_header").prop("value", values);
}

function ShowPassMenu(e) {
    var values = $(e).parent().parent().prop("value");
    $("#reset_pass_user_name").prop("value", values);
    $("#reset_pass_user_name").text(values[1]);
    $("#reset_pass_instructions").text("");
    $("#reset_user_password").modal("show");
}

function RequestPasswordReset() {
    if (notFilled("admin_username_reset") || notFilled("admin_password_reset")) {
        return;
    }
    var data = {
        "id": $("#reset_pass_user_name").prop("value")[2],
        "randomize": $("#randomize_pass").is(":checked"),
        "new_on_logon": $("#new_pass_login").is(":checked") || is_reset,
        "admin_user": $("#admin_username_reset").val(),
        "admin_pass": $("#admin_password_reset").val()
    };
    SOCKET.emit("request_password_reset", data);
}

function ShowLockMenu(e, is_lock) {
    if (is_lock) {
        $("#confirm_unlock_acct").removeClass("is_hidden");
        $("#confirm_lock_acct").addClass("is_hidden");
        $("#acct_lock_status").text("LOCKED");
    } else {
        $("#confirm_unlock_acct").addClass("is_hidden");
        $("#confirm_lock_acct").removeClass("is_hidden");
        $("#acct_lock_status").text("UNLOCKED");
    }
    var values = $(e).parent().parent().prop("value");
    $("#lock_acct_name").prop("value", values);
    $("#lock_acct_name").text(values[1]);
    $("#lock_acct_modal").modal("show");
}

// Tells the server to keep the user active
function UpdateActivity() {
    SOCKET.emit("update_activity");
}


/* Portal Functions */

function AddPortalToTable(name, key, ip, camera_ip, alarm_lvl) {
    var actions_col = $(`<td class="actions text-center"><a class="delete_portal"><i class="fas fa-trash-alt"></i></a></td>`);
    actions_col.prop("value", [name, key, camera_ip]);

    var row = $("<tr></tr>");
    row.append(`<td>${name}</td>`);
    row.append(`<td>${key}</td>`);
    row.append(`<td>${ip}</td>`);
    row.append(`<td>${camera_ip}</td>`);
    row.append(`<td>${alarm_lvl}</td>`);
    row.append(actions_col);

    $("#portals_table").append(row);
}


/* Scan Functions */

// Creates the event div in either the History or Live view
function CreateEvent(scan, append_to, button_id, append = false) {
    console
    var event_div = $(`<div class=\"event d-flex\"></div>`);
    event_div.prop("value", scan.id);
    event_div.addClass((scan.is_alarm) ? "alarm" : "clear");

    var scan_level = $("<i class=\"fas fa-circle event_icon fit-content mt-1\"></i>");
    scan_level.addClass((scan.is_alarm) ? "alarm" : "clear");

    var event_time = $("<span class=\"text-right w-75 mt-1\"></span>");
    event_time.text(scan.time);

    event_div.append(scan_level);
    event_div.append(event_time);

    var toggle_btn = `#${button_id}`;

    if ($(toggle_btn).hasClass("toggle_alarm") && !scan.is_alarm) {
        event_div.addClass("is_hidden");
    }

    if (append) {
        $(`#${append_to}`).append(event_div);
    }
    else {
        $(`#${append_to}`).prepend(event_div);
    }


    ID_TO_ELEMENT.set(scan.id, event_div)
}

function FillHistoryEvents() {
    HISTORY_ARR.forEach((id) => {
        CreateEvent(ALL_SCANS.get(id), "his_event_cont", "his_alarm_btn");
    });
}

function ShowMainPane() {
    $("#his_event_cont").addClass("is_hidden");
    $("#his_input").addClass("is_hidden");
    $("#his_header").addClass("is_hidden");
    $("#report_section").addClass("is_hidden");

    $("#scan_1_cont").removeClass("is_hidden")
    $("#scan_2_cont").removeClass("is_hidden")
    $("#primary_scan_cont").removeClass("is_hidden");
    $("#today_header").removeClass("is_hidden");
    $("#monitor_section").removeClass("is_hidden");

    $("#day_event_cont").removeClass("is_hidden");
    ViewScan(CUR_SCAN);
}

function ShowHistoryPane() {
    $("#his_event_cont").removeClass("is_hidden");
    $("#his_input").removeClass("is_hidden");
    $("#his_header").removeClass("is_hidden");
    $("#scan_1_cont").removeClass("is_hidden")
    $("#scan_2_cont").removeClass("is_hidden")
    $("#primary_scan_cont").removeClass("is_hidden");
    $("#monitor_section").removeClass("is_hidden");
    $("#snapshot_btn").addClass("disabled");

    $("#report_section").addClass("is_hidden");
    $("#today_header").addClass("is_hidden");
    $("#day_event_cont").addClass("is_hidden");
}

function ShowReportPane() {
    $("#monitor_section").addClass("is_hidden");
    $("#report_section").removeClass("is_hidden");
}


/* Functions for Navigation Buttons / Footer buttons */
function LoadHistoryPane() {
    $(".report_scans").addClass("is_hidden");
    $("#report_btn").removeClass("active_btn");
    $(".main_scan").removeClass("is_hidden");

    NOT_HISTORY_VIEW = $("#history_btn").hasClass("active_btn");

    if (NOT_HISTORY_VIEW) {
        ShowMainPane();
        TogglePortalButtons();
        $("#export_btn").removeClass("disabled");
        CUR_SCAN = LAST_SCAN;
        ViewScan(CUR_SCAN);
    } else {
        ShowHistoryPane();
        if ($("#history_chooser").val().length > 0) {
            $("#total_scans").text(HIS_SCAN_NUM);
            $("#total_alarms").text(HIS_ALARM_NUM);
            let his_scan = null;
            try {
                his_scan = ALL_SCANS.get(HISTORY_ARR[0]);
            } catch (e) {
                console.log("No Current Scan");
            }
            ViewScan(his_scan);
        }
    }


    $("#history_btn").toggleClass("active_btn");
}

// Loads the report pane on the monitor page
function LoadReportPane() {

    // Hide History Panes
    $("#history_btn").removeClass("active_btn");
    $("#his_event_cont").addClass("is_hidden");
    $(".history_event_card").addClass("is_hidden");
    NOT_HISTORY_VIEW = true;

    if ($("#report_btn").hasClass("active_btn")) {
        ShowMainPane();
        TogglePortalButtons();
        $("#export_btn").removeClass("disabled");

    } else {
        // Hide Main/History Pane
        $("#monitor_section").addClass("is_hidden")

        // Show Report Panes
        $("#report_section").removeClass("is_hidden");

        $("#snapshot_btn").addClass("disabled");
        $("#export_btn").addClass("disabled");
    }

    $("#report_btn").toggleClass("active_btn");
}


// Shows the menu for the clicked settings button
function ShowSettingsMenu(id) {
    var settings_id = `#${id}_settings`;
    $(".settings").addClass("is_hidden");
    $(".setting_choice").removeClass("disabled");
    $(`#${id}`).addClass("disabled");
    $(settings_id).toggleClass("is_hidden");
}

// Changes the view from monitor to administration and back
function ChangeView(is_admin) {
    var val = (is_admin) ? 1 : 0;
    $('#admin_change').carousel(val);
    $("#settings_btn_container").toggleClass("is_hidden");
    $("#monitor_btn_container").toggleClass("is_hidden");

    // Toggle Lower Row
    ToggleNavButtons(is_admin);

    // Toggle Main Pane
    (is_admin) ? ToggleMonitor() : ShowMainPane();

    ISADMIN = is_admin;
    TogglePortalButtons();
}

// Takes a screenshot of the monitor frame and then opens a new window with it
function TakeScreenshot() {
    try {
        $("#export_btn").addClass("disabled");
        html2canvas(document.querySelector("#primary_scan_cont"), {
            scrollX: 0,
            scrollY: 0
        }).then(canvas => {
            canvas.toBlob(blob => {
                var objectURL = URL.createObjectURL(blob);
                window.open(objectURL);
                $("#export_btn").removeClass("disabled");
            }, 'image/jpg');
        });
    } catch {
        $("#export_btn").addClass("disabled");
    }
}

// Toggle if the Alarm events are the only ones shown
function ToggleAlarmEvents(alarm_only) {
    if (alarm_only) {
        $(".event.clear").addClass("is_hidden")
    } else {
        $(".event.clear").removeClass("is_hidden")
    }
}

function ToggleNoScanner() {
    $("#snapshot_loader").addClass("is_hidden");
    $("#snapshot_btn").removeClass("is_hidden");
    $("#snapshot_btn").attr("disabled", "disabled");
}

function ToggleMonitor() {
    // Hide Report Panes
    $(".report_scans").addClass("is_hidden");
    $("#report_btn").removeClass("active_btn");

    // Hide History Pane
    $("#his_event_cont").addClass("is_hidden");
    $(".history_event_card").addClass("is_hidden");
    $("#history_btn").removeClass("active_btn");
    NOT_HISTORY_VIEW = true;

    // Show Main Pane
    $(".main_scan").removeClass("is_hidden");
    $("#day_event_cont").removeClass("is_hidden");
    $(".monitor_title").text("Monitoring (Live)");

}

function ToggleNavButtons(is_admin) {
    if (is_admin) {
        $("#export_btn").addClass("disabled");
        $("#history_btn").addClass("disabled");
        // $("#stats_btn").addClass("disabled");
        $("#report_btn").addClass("disabled");
    } else {
        $("#export_btn").removeClass("disabled");
        $("#history_btn").removeClass("disabled");
        // $("#stats_btn").removeClass("disabled");
        $("#report_btn").removeClass("disabled");

    }
}
function TogglePortalButtons() {
    (SCANNER_ON && !ISADMIN) ? $("#snapshot_btn").removeClass("disabled") : $("#snapshot_btn").addClass("disabled");
    (SCANNER_ON) ? $("#align_camera").removeClass("disabled") : $("#align_camera").addClass("disabled");
    (SCANNER_ON) ? $("#view_camera").removeClass("disabled") : $("#view_camera").addClass("disabled");
    $("#restart_viewscan_modal_btn").removeClass("disabled");
}


/* Loaded in data functions */

// Put scanners into the table & into the dropdown
function InsertScanner(s, client_key) {
    // Add the portal to the dropdown
    var portal_settings = JSON.parse(s.portal_settings);

    var scanner_choice = $("<a></a>");

    var scanner_name = $(`<h3 class='m-0'>${portal_settings.install_loc}</h3>`);
    var status_container = $(`<div class="mx-2 text-left"></div>`);

    var portal_status = $(`<h6 class="m-0"><i class="fa fa-circle mr-2" id="${s.portal_key}_portal_status"></i>Scanner</h6>`);
    var camera_status = $(`<h6 class="m-0"><i class="fa fa-circle mr-2" id="${s.portal_key}_camera_status"></i>Camera</h6>`);

    status_container.append(portal_status, camera_status);
    scanner_choice.append(scanner_name, status_container);

    scanner_choice.prop("value", s.portal_key);
    scanner_choice.attr("class", "dropdown-item room_choice d-flex justify-content-center");

    $("#room_dropdown").append(scanner_choice);
    if (s.portal_key === client_key) {
        $("#no_rooms").remove();
        $("#room_selection_cont").removeClass("is_hidden");
        $("#room_dropdown").removeClass("is_hidden");
        $("#room_selection").text(portal_settings.install_loc);
        $("#info_key").text(s.portal_key);
        SOCKET.emit("request_portal_settings", s.portal_key);
    }

    // Add the portal to the Portal Table
    AddPortalToTable(portal_settings["install_loc"], s.portal_key, s.portal_ip, s.camera_ip, portal_settings["alarm_thresh"]);
}

// Fill the settings with the current scanner's
function PopulatePortalSettings(scanner) {
    /* Load Portal Settings */
    var portal_set = JSON.parse(scanner.portal_settings);

    $("#portal_id").val(scanner.portal_key);
    $("#portal_loc").val(portal_set["install_loc"]);
    $("#portal_serial_num").val(portal_set["serial_num"]);
    $("#portal_alarm_thresh").val(portal_set["alarm_thresh"]);
    $("#max_scan_age").val(scanner.max_scan_age);
    $("#portal_ip").val(scanner.portal_ip);
    $("#portal_gain").val(portal_set["gain"]);
    $("#portal_dns_1").val(portal_set["dns_1"]);
    $("#portal_dns_2").val(portal_set["dns_2"]);

    $("#mjpeg_stream_btn").prop("href", `http://${location.host}/stream?portal=${portal_set["install_loc"]}`);
    $("#rtsp_path").text(portal_set["install_loc"]);

    if (portal_set["swap_sensors"]) {
        $("#swap_scanners").attr("checked", true);
    } else {
        $("#swap_scanners").removeAttr("checked");
    }

    /* Populate Info */
    $("#info_ip").text(scanner.portal_ip);
    $("#info_key").text(scanner.portal_key);
    $("#open_scanner_page").prop("href", `http://${scanner.portal_ip}`);

    /* Load Camera Settings */
    SOCKET.emit("request_cam_settings", scanner.camera_key);
    portal_set["enable_camera"] ? $("#cam_enable").attr("checked", true) :
        $("#cam_enable").removeAttr("checked");



    // Set the current viewed scanner
    CAM_KEY = scanner.camera_key;

    if (SCAN_KEY != undefined) {
        $("#camera").removeClass("disabled");
        $("#portals").removeClass("disabled");
        $("#portals_settings").addClass("is_hidden");
        $("#portal_settings").removeClass("is_hidden");
    }
}

// Fill the settings with the current scanner's camera
function PopulateCameraSettings(cam) {
    /* Load Camera Settings */
    var cam_settings = JSON.parse(cam.camera_settings);

    $("#cam_id").val(cam.camera_key);
    $("#cam_ip").val(cam.camera_ip);
    $("#rtsp_url_cam_ip").text(cam.camera_ip);
    $("#cam_port").val(cam_settings["port_num"]);
    $("#cam_username").val(cam_settings["username"]);
    $("#cam_password").val("");
    $("#cam_delay").val(cam_settings["delay"]);
    $("#cam_dns_1").val(cam_settings["dns_1"]);
    $("#cam_dns_2").val(cam_settings["dns_2"]);
    $("#portal_warp_corners").val(JSON.stringify(cam_settings["warp_corners"]));

    $("#cam_make").val(cam_settings["make"].toLowerCase());
    $("#rtsp_url").val(cam_settings["rtsp_url"]);

    $("#cam_rotation").val(cam_settings["rotation"]);
    $("#cam_fps").val(cam_settings["fps"]);
    $("#cam_resolution").val(cam_settings["resolution"]);

    $("#open_cam_page").prop("href", `http://${cam.camera_ip}`);
}

// Fill the settings with the global notification settingss
function PopulateNotificationSettings(notif) {
    /* Load Notification Settings */
    var notif_set = JSON.parse(notif.settings);
    var email_set = notif_set["email"];
    var tcp_set = notif_set["tcp"];

    email_set["is_enabled"] ? $("#enable_email").attr("checked", true) :
        $("#enable_email").removeAttr("checked");
    $("#email_service").val(email_set["service"]);
    $("#smtp_port").val(email_set["smtp_port"]);
    $("#email_username").val(notif.email_user);
    $("#msg_subject").val(notif_set["msg_subject"]);
    $("#msg_body").text(notif_set["msg_body"]);

    {
        $("#disconnect_email_input").val(email_set["disconnect_emails"]);
        $("#scan_email_input").val(email_set["scan_emails"]);
    }

    if (tcp_set["is_enabled"]) {
        $("#enable_tcp").attr("checked", true);
    } else {
        $("#enable_tcp").removeAttr("checked");
    }
    $("#msg_tcp_ip").val(tcp_set["ip_addrs"].join(","));
    $("#msg_tcp_port").val(tcp_set["port_nums"]);

    $("#tcp_msg").val(tcp_set["tcp_msg"])

    try {
        var filter_set = notif_set["filter"];
        filter_set["msg_disconnect"] ? $("#msg_disconnect").attr("checked", true) :
            $("#msg_disconnect").removeAttr("checked");
        $("#email_scan_type").val(filter_set["email_scan_type"]);
        $("#tcp_scan_type").val(filter_set["tcp_scan_type"]);
    }
    catch { }

    GenerateExampleMessage();
}

// Fill the settings with the global security settings
function PopulateSecuritySettings(sec) {
    // Load these values into the security section
    $("#pass_length").val(sec["pass_length"]);
    $("#pass_num_chars").val(sec["pass_num_chars"]);
    $("#pass_special_chars").val(sec["pass_special_chars"]);
    $("#init_load_scans").val((sec["init_load_scans"] != 1000) ? sec["init_load_scans"] : "ALL");

    // Load these values into password sections
    $("#add_pass_length").text(sec["pass_length"]);
    $("#add_pass_num_chars").text(sec["pass_num_chars"]);
    $("#add_pass_special_chars").text(sec["pass_special_chars"]);

    // Load these values into password sections
    $("#edit_pass_length").text(sec["pass_length"]);
    $("#edit_pass_num_chars").text(sec["pass_num_chars"]);
    $("#edit_pass_special_chars").text(sec["pass_special_chars"]);

    // Load these values into password sections
    $("#force_pass_length").text(sec["pass_length"]);
    $("#force_pass_num_chars").text(sec["pass_num_chars"]);
    $("#force_pass_special_chars").text(sec["pass_special_chars"]);

    // Set the local Password settings
    PASS_SET = sec;
}

// Fill the settings with the global rtsp settings
function PopulateRTSPSettings(rtsp) {
    if (rtsp.is_enabled) {
        $("#rtsp_enable").attr("checked", true);
    } else {
        $("#rtsp_enable").removeAttr("checked");
    }
    ToggleRestartRTSP();

    $("#rtsp_username").val(rtsp.username);
    $("#rtsp_port").val(rtsp.port);
    $("#rtsp_pass").val("");
    $("#rtsp_auth").text(`rtsp://${rtsp.username}:****@`);
    $("#rtsp_link").text(`${location.hostname}:${rtsp.port}/`);

    // Only enable the settings page once all are loaded in
    $("#settings_btn").removeClass("disabled");
}

function PopulateP8221Settings(data) {
    var set = JSON.parse(data["settings"]);
    var pin_data = set["pin_data"];
    var user = data["user"];
    $("#enable_p8221").attr("checked", set["enabled"]);
    $("#p8221_ip_addr").val(set["ip_addr"]);
    $("#p8221_user").val(user);
    $("#p8221_action_notif").val(set["action_notif"]);
    $("#pin_2_state_change").val(pin_data["2"]["action"]);
    $("#pin_3_state_change").val(pin_data["3"]["action"]);
    $("#pin_4_state_change").val(pin_data["4"]["action"]);
    $("#pin_5_state_change").val(pin_data["5"]["action"]);
    $("#pin_6_state_change").val(pin_data["6"]["action"]);
    $("#pin_7_state_change").val(pin_data["7"]["action"]);
    $("#pin_8_state_change").val(pin_data["8"]["action"]);
    $("#p8221_pulse_dur").val(set["pulse_dur_ms"]);
}

async function PopulateSoundData(sound_data) {
    // Empty the current dropdown
    $("#alarm_sound").empty();

    for (var file of sound_data) {
        var option = `<option value="${file}">${file.split(".")[0]}</option>`;
        $("#alarm_sound").append(option);
    }

    // Set the audio
    var stored = GetLocalStorage("alarm_sound");
    if (stored == null) {
        $("#alarm_sound").val("Warning.mp3")
    }
    else {
        $("#alarm_sound").val((sound_data.includes(stored)) ? stored : "Chime.mp3");
    }
}


/*
    Socketed Server requests/returns
*/

// Returns the latest scans for the given day
function GetStartingScans(day) {
    console.log("Requesting Today's Scans");
    HISTORY_REQ_TIME = new Date().getTime();
    let date_str = new Date(GetDate()).getTime();
    if (!NOT_HISTORY_VIEW) {
        $("#his_loader").removeClass("is_hidden");
        $("#history_events").empty();
        $(".history_scan_container").addClass("is_hidden");
    }
    SOCKET.emit("request_starting_scans", date_str);
    SOCKET.emit("request_check_more_scans", date_str);
}

// Returns all the scans of a full day
function GetDayScans(day) {
    HISTORY_REQ_TIME = new Date().getTime();
    let date_str = new Date(day).getTime();
    if (!NOT_HISTORY_VIEW) {
        $("#his_loader").removeClass("is_hidden");
        $("#history_events").empty();
        $(".history_scan_container").addClass("is_hidden");
    }
    SOCKET.emit("request_day_scans", date_str);
}

function GetUserInfo() {
    SOCKET.emit("request_all_user_info");
}

function GetScanners() {
    SOCKET.emit("request_scanners");
}

function RequestLogout() {
    SOCKET.emit("logout_request");
}

// The scanner has 3 seconds to complete a scan after the snapshot is requested
function RequestSnapshot() {
    Scan_Req_Time = new Date().getTime();
    $("#snapshot_btn").addClass("is_hidden");
    $("#snapshot_loader").removeClass("is_hidden");
    setTimeout(function () {
        if ($("#snapshot_btn").hasClass("disabled")) {
            $("#snapshot_loader").addClass("is_hidden");
            $("#snapshot_btn").removeClass("is_hidden");
            $("#snapshot_btn").removeAttr("disabled");
            $("#snapshot_btn").addClass("err_btn");
        }
    }, 3000);
    SOCKET.emit("request_snapshot");
}

// Request screenshot from the ViewScan camera for user drawing
// Request Camera Capture -> Open Modal ->
function AlignCamera() {
    // Hide/Show menus
    $("#align_cam_loader").removeClass("is_hidden");
    canvas = document.getElementById("align_cam_canvas");
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height); //clear html5 canvas.
    // $("#align_points").text("No Points Clicked");

    // // Disable the alignment buttons
    // $("#submit_cam_align").addClass("disabled");

    CAM_ALIGN_POINTS = [];
    WARP_POINTS = [];
    SOCKET.emit("request_ip_cam_frame");
}

// Request restart of the connected ViewScan
function RestartScanner() {
    SCANNER_ON = false;
    SOCKET.emit("restart_scanner_request");
    $("#restart_viewscan_modal_btn").addClass("disabled");
}
// Request restart of the RTSP Service
function RestartRTSP() {
    SOCKET.emit("restart_rtsp_request");
}
function ToggleRestartRTSP() {
    try {
        var enable_restart = $("#rtsp_enable").is(":checked");
        if (enable_restart) {
            $("#restart_rtsp").removeClass("disabled");
        }
        else {
            $("#restart_rtsp").addClass("disabled");
        }
    }
    catch (err) {
        console.log(err);
    }
    CheckDeviceStatus();
}

// Get the status of the portal & camera
function CheckDeviceStatus() {
    SOCKET.emit("request_device_status");
}

// Check Password/username on each input
// The ID is use to get what pass input is being checked
function StartPasswordCheck(id) {
    var is_valid = CheckPassValidity($(`#${id}`).val());
    is_valid ? $(`#${id}`).removeClass("err_val") : $(`#${id}`).addClass("err_val");
    return is_valid;
}

function CheckPassValidity(pass) {
    // console.log(pass.length, pass.replace(/[^0-9]/g, ""), pass.replace(/[^<>;.:_+#*!$%&?]/g, ""));
    // console.log([pass.length > PASS_SET["pass_length"], pass.replace(/[^0-9]/g, "").length >= PASS_SET["pass_num_chars"],
    // pass.replace(/[^<>;.:_+#*!$%&?]/g, "").length >= PASS_SET["pass_special_chars"], (pass.replace(/[^a-z]/g, "").length >= 1 && pass.replace(/[^A-Z]/g, "").length >= 1)]);

    // Check that the password meets the required minimums
    return (pass.length >= PASS_SET["pass_length"] &&
        pass.replace(/[^0-9]/g, "").length >= PASS_SET["pass_num_chars"] && // Number Characters
        pass.replace(/[^<>;.:_+#*!$%&?]/g, "").length >= PASS_SET["pass_special_chars"] && // Special Characters
        (pass.replace(/[^a-z]/g, "").length >= 1 && pass.replace(/[^A-Z]/g, "").length >= 1)); // Different Case Characters
}
function CheckUsernameValidity(id) {
    var letter_or_num = /^[0-9a-zA-Z]+$/;
    var is_valid = $(`#${id}`).val().length >= 5 && letter_or_num.test($(`#${id}`).val());
    is_valid ? $(`#${id}`).removeClass("err_val") : $(`#${id}`).addClass("err_val");
    return is_valid;
}

function LocalPortalNameCheck(name) {
    name = name.replace(/[^a-zA-Z0-9_ ]/g, "", "")
    if (name.length > 13) {
        name = name.substring(0, 13);
    }
    if (name.indexOf(" ") > -1) {
        name = name.replace(" ", "_");
    }
    return name;
}

// Generate example messages from input text
function GenerateMessage(scan, base) {
    base = base.replace(/%NAME%/g, "SCANNER_NAME");
    base = base.replace(/%IP%/g, "127.0.0.1");
    base = base.replace(/%KEY%/g, scan.scan_key);
    base = base.replace(/%DATE%/g, scan.scan_date);
    base = base.replace(/%TIME%/g, scan.scan_time);
    base = base.replace(/%SID%/g, scan.scan_id);
    base = base.replace(/%PEAK%/g, Max(scan.scan_values));
    return base;
}

function GenerateExampleMessage() {
    var type = ($("#email_scan_type").val() == 1) ? "Alarm" : "Passage";

    var val_subject = GenerateMessage(EXAMPLE_SCAN, $("#msg_subject").val());
    val_subject = (val_subject.length == 0) ? `ViewScan ${type}` : `ViewScan ${type} ${val_subject}`
    $("#ex_subject").val(val_subject);

    val_subject = GenerateMessage(EXAMPLE_SCAN, $("#tcp_msg").val());
    $("#ex_tcp_msg").val(val_subject);
}


// Initialize Everything
$(document).ready(() => {
    initSocket();
    init();
    initRegex();
    initAdmin();
    initTable();

    // Get Today's Scans
    GetStartingScans()

    $("body").removeClass("is_hidden");
});

const EXAMPLE_SCAN = {
    "scan_id": Math.floor(Date.now() / 1000),
    "scan_key": "000000000000",
    "scan_date": "1/1/2021",
    "scan_time": "12:00 AM",
    "scan_values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "scan_image": "BASE_64_STRING",
    "alarm_lvl": 35
}