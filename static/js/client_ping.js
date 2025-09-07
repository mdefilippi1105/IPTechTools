// created to simulate ping, as server side code only measures from server to
// the entered destination. this uses async. the async function returns a Promise-
// a promise represents work to be completed later - good for network calls

async function clientPing(ev){
    //stop reload
    ev.preventDefault();
    const ip = document.querySelector('input[name="latency-input"]').value

    // performance.now is a built-in browser object to measure time
    const begin = performance.now()

    //5 second timeout
    const timer = setTimeout(() => {
    document.getElementById("result").textContent = "Timed out (5s)";
    hideSpinner();
    }, 5000);

    try {
        // wait until promise finish. request the website. no-cors is a fetch option
        await fetch("https://" + ip, {mode: "no-cors"});
        clearTimeout(timer);
        // get precise time again and subtract the starting time we saved earlier
        const ms = performance.now() - begin;
        document.getElementById("latency-output").textContent = "Ping ~" + ms + "ms";
    } catch (e) {
        clearTimeout(timer);
        document.getElementById("latency-output").textContent = "Host unreachable";
        hideSpinner();
    }
    finally {
        hideSpinner();
        }
}