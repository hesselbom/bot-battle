console.log("HTML5 Renderer");

window.Renderer = (function($) {
    var $arena = $('#battlefield');

    return {
        init: function(engine) {
            this._engine = engine;
            this._render();
        },
        addBullet: function(bullet) {
            var $el = $('<div class="bullet">').appendTo($arena);
            bullet.$el = $el;
            this._updatePos(bullet);
        },
        killBullet: function(bullet) {
            bullet.$el.remove();
        },
        hideBullet: function(bullet) {
            bullet.$el.hide();
        },
        showBullet: function(bullet) {
            bullet.$el.show();
        },
        addBot: function(bot) {
            var $el = $('<div class="bot">').css({
                'background': 'url("'+bot.bot.image+'")'
            }).appendTo($arena);
            $('<div class="health">').appendTo($el);
            bot.$el = $el;
            this._updatePos(bot);
        },
        botHit: function(bot) {
            $('.health', bot.$el).css('width', Math.round(100 * (bot.health / BotBattle.MAX_HEALTH))+'%');
        },
        killBot: function(bot) {
            bot.$el.addClass('_dead');
        },
        unkillBot: function(bot) {
            bot.$el.removeClass('_dead');
        },
        showReplay: function(winnerBot, loserBot) {
            return true;
        },
        startingAnimation: function(callback) {
            return false;
        },

        _render: function() {
            var _this = this;
            $.each(this._engine.bullets, function(i, bullet) {
                _this._updatePos(bullet);
            });
            $.each(this._engine.bots, function(i, bot) {
                _this._updatePos(bot);
            });
            requestAnimationFrame(this._render.bind(this));
        },
        _updatePos: function(entity) {
            if (typeof entity.$el !== 'undefined') {
                entity.$el.css('transform', 'translate('+entity.pos.x+'px,'+entity.pos.y+'px)');
            }
        }
    };
}(jQuery));
