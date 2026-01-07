const images = [
    "/static/charts/traffic_graph.png",
    "/static/charts/trend_graph.png",
    "/static/charts/cred_graph.png",
    "/static/charts/device_graph.png"
];

//start at image 0
let index = 0;
const img = document.getElementById("dash-rotator");

//start a repeating timer -> every 5 seconds rerun code
setInterval(() => {
    //instantly make image transparent
    img.style.opacity = 0;

    setTimeout(() => {
    //move to the next image and then loop back to 0 when we reach the end.
    index = (index + 1) % images.length
    //changes image file, updates <img> tag, loads new image
    img.src = images[index];
    //make image visible
    img.style.opacity = 1;
    //let the fade-out finish
    }, 250)
}, 5000)