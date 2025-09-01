        // let counter = 0;
        //
        // function count (){
        //     counter++;
        //     document.querySelector('h2').innerHTML = counter;
        //
        //     if (counter % 10 === 0) {
        //                 alert(`The counter is now ${counter}`)
        //     }
        // }
        // document.addEventListener('DOMContentLoaded', function() {
        // document.querySelector('button').onclick = count;
        // });
        // function hello(){
        //     const heading = document.querySelector('h1')
        //     if (heading.innerHTML === 'Hello!'){
        //         heading.innerHTML = 'Goodbye!';
        //     } else {
        //         heading.innerHTML = 'Hello!';
        //     }
        //
        // }





document.addEventListener('DOMContentLoaded', function() {
     //for each of all buttons I would like to run a function
    document.querySelectorAll('button').forEach(button => {
       button.onclick = function () {
          document.querySelector('#hello').style.color = button.dataset.color;


    document.querySelector('form').onsubmit = function (){
        const name = document.querySelector('#name').value;
        alert(`Hello ${name}`);
    };

});