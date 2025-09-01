function renderJson(jsonObj) {
    const output = document.getElementById("json-display");
    output.textContent = JSON.stringify(jsonObj, null, 4);
}

function renderPingOutput(outputText) {
    const output = document.getElementById("ping-output");
    output.textContent = outputText;
}

function renderTraceOutput(outputText) {
    const output = document.getElementById("trace-output");
    output.textContent = outputText;
}

function renderJsonGeo(jsonObj) {
    const output = document.getElementById("geo-display");
    output.textContent = JSON.stringify(jsonObj, null, 4);
}

function renderJsonMac(jsonObj) {
    const output = document.getElementById("mac-display");
    output.textContent = JSON.stringify(jsonObj, null, 2);
}
function renderPublicIp(outputText) {
    const output = document.getElementById("public-output");
    output.textContent = outputText;
}

function loopResult(jsonObj) {
    const output = document.getElementById("mac-display");

    let text = "";
    // for every property name...
    for (const key in jsonObj) {
        // list key pair w/ newline at the end
        text += `${key}: ${jsonObj[key]}\n`;
    }
    output.textContent = JSON.stringify(jsonObj, null, 2)
}
function loopDeepResult(jsonObj) {
    const output = document.getElementById("deep-display");

    let text = "";
    // for every property name...
    for (const key in jsonObj) {
        // list key pair w/ newline at the end
        text += `${key}: ${jsonObj[key]}\n`;
    }
    output.textContent = JSON.stringify(jsonObj, null, 2)
}
function publicIpResult(jsonObj) {
    const output = document.getElementById("public-output");

    let text = "";
    // for every property name...
    for (const key in jsonObj) {
        // list key pair w/ newline at the end
        text += `${key}: ${jsonObj[key]}\n`;
    }
    output.textContent = JSON.stringify(jsonObj, null, 2)
}