    // don't so anything until the page loads
    document.addEventListener('DOMContentLoaded', function() {
      // select all buttons
      let buttons = document.querySelectorAll('.tool-button')
        //  for btn in buttons:
        buttons.forEach(btn => {
          //   when the button is clicked
          btn.addEventListener('click', function (event) {
              //prevents load to the link instantly
              event.preventDefault();
              //read and store where the link is going
              const url = this.getAttribute('href');
              // add css animation
              this.classList.add('flash');
              // set timeout = the code to run later + how long to wait
              // the browser window, location.href is the full URL
              setTimeout(() => window.location.href = url, 300);
              //     this.classList.remove('flash');
              // }, 500);
          });
      });
  })