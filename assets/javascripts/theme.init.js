// Existing plugins initialization (your original code starts here)
(function( $ ) {
  'use strict';

  if ( $.isFunction( $.fn['popover'] ) ) {
    $( '[data-toggle=popover]' ).popover();
  }

}).apply( this, [ jQuery ] );

// ... (your other plugin initializations remain untouched) ...

// Sidebar toggle on click (NEW - required logic)
(function($) {
  'use strict';

 // $('[data-toggle-class][data-target]').on('click', function(e) {
  //  e.preventDefault();

    var $this = $(this),
        toggleClass = $this.data('toggle-class'),
        target = $this.data('target');

    $(target).toggleClass(toggleClass);

    var eventName = $this.data('fire-event');
    if (eventName) {
      $(window).trigger(eventName);
    }
  });

})(jQuery);
