(function($) {
    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    }

    window.Vector2 = THREE.Vector2;
    window.Enum = function(id, value) {
        return { id: id, value: value };
    };

    $(function() {
        switch(getUrlParameter('renderer')) {
            case '3d':
                $.getScript('/js/renderers/3d.js');
                break;
            case 'html5':
            default:
                $.getScript('/js/renderers/html5.js');
        }
    });
}(jQuery));
