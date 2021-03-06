(function($) {
    var _DoNothing = 1,
        _MoveUp = 2,
        _MoveDown = 3,
        _MoveLeft = 4,
        _MoveRight = 5,
        _Shoot = 6,
        RELOAD_FRAMES = 70,
        MAX_HEALTH = 5,
        BULLET_SPEED = 2,
        BOT_WIDTH = 32,
        BOT_HEIGHT = 32,
        ARENA_WIDTH = 800,
        ARENA_HEIGHT = 800,
        MIN_POS = new Vector2(0, 0),
        MAX_POS = new Vector2(ARENA_WIDTH, ARENA_HEIGHT),
        DESTROY_MIN_POS = new Vector2(-BOT_WIDTH, -BOT_HEIGHT),
        DESTROY_MAX_POS = new Vector2(ARENA_WIDTH + BOT_WIDTH, ARENA_HEIGHT + BOT_HEIGHT),
        START_POSITIONS = [
            new Vector2(50, 50),
            new Vector2(ARENA_WIDTH - 50, ARENA_HEIGHT - 50)
        ];

    window.DoNothing = Enum(_DoNothing);
    window.MoveUp = Enum(_MoveUp);
    window.MoveDown = Enum(_MoveDown);
    window.MoveLeft = Enum(_MoveLeft);
    window.MoveRight = Enum(_MoveRight);
    window.Shoot = function(degreesOrVector) {
        return Enum(_Shoot, degToVec(degreesOrVector));
    };

    window.BotBattle = {
        MIN_POS: MIN_POS,
        MAX_POS: MAX_POS,
        MAX_HEALTH: MAX_HEALTH,
        BOT_WIDTH: BOT_WIDTH,
        BOT_HEIGHT: BOT_HEIGHT,
        ARENA_WIDTH: ARENA_WIDTH,
        ARENA_HEIGHT: ARENA_HEIGHT
    };

    var engine = {
            bots: [],
            bullets: [],
            running: false,
            getFps: function() {
                var $input = $('[data-fps]'),
                    fps = parseInt($input.val());
                if (fps <= 0) fps = 1;
                if (fps >= 1000) fps = 1000;
                $input.val(fps);
                return 1000 / fps;
            }
        },
        _storedEngine,
        _runningInterval,
        _botIds = 1,
        _bulletIds = 1,
        _firstTimePlaying = true,
        _winnerBot,
        _replayRunning = false,
        _storedReplay = [],
        _replayLength = 300,
        _replayMinSpeed = 0.1,
        _replayMaxSpeed = 0.5,
        _replayLengthExtraStart = 50,
        _replayLengthExtraEnd = 50,
        _replayStep = 0,
        _gameOver = false,
        _endedADraw = false,
        _timerSteps = 10,
        _timer = 1000 * 60 * 5;

    function degToVec(degreesOrVector) {
        if (degreesOrVector instanceof Vector2) {
            return degreesOrVector;
        }

        var radians = parseFloat(degreesOrVector - 90) * (Math.PI/180);
        return new Vector2(Math.cos(radians), Math.sin(radians));
    }

    function pointInRectangle(point, rectangleMin, rectangleMax) {
        return point.x > rectangleMin.x &&
            point.x < rectangleMax.x &&
            point.y > rectangleMin.y &&
            point.y < rectangleMax.y;
    }

    function updateBounds(bot) {
        bot.topLeft.x = bot.pos.x - BOT_WIDTH / 2;
        bot.topLeft.y = bot.pos.y - BOT_HEIGHT / 2;
        bot.btmRight.x = bot.pos.x + BOT_WIDTH / 2;
        bot.btmRight.y = bot.pos.y + BOT_HEIGHT / 2;
    }

    function addBot(name) {
        if (engine.bots.length >= START_POSITIONS.length) {
            alert('Max amount of allowed bots reached');
            return;
        }
        $.getScript('/js/bots/' + name + '.js')
            .done(function() {
                var botWrapper = {
                    id: _botIds++,
                    pos: START_POSITIONS[engine.bots.length].clone(),
                    topLeft: new Vector2(0, 0),
                    btmRight: new Vector2(0, 0),
                    bot: window.Bot,
                    health: MAX_HEALTH,
                    reload: RELOAD_FRAMES,
                    prevCommand: DoNothing,
                    prevPos: null
                };
                updateBounds(botWrapper);
                engine.bots.push(botWrapper);
                botWrapper.bot.init(botWrapper.id);
                window.Renderer.addBot(botWrapper);
                window.Bot = null;

                if (engine.bots.length >= START_POSITIONS.length) {
                    $('[data-bot]').addClass('disabled');
                    return;
                }
            });
    }

    function addBullet(bot, dir) {
        var direction = degToVec(dir).normalize();
        var bullet = {
            id: _bulletIds++,
            bot: bot,
            pos: bot.pos.clone(),
            dir: direction,
            vel: direction.multiplyScalar(BULLET_SPEED)
        };
        engine.bullets.push(bullet);
        return bullet;
    }

    function initRenderer() {
        (function() {
            if (typeof window.Renderer !== 'undefined') {
                window.Renderer.init(engine);
            }
            else {
                setTimeout(arguments.callee, 10);
            }
        }());
    }

    function step() {
        if (!_gameOver) {
            _timer -= _timerSteps;
            var fullSeconds = _timer / 1000;
            var seconds = Math.max(0, Math.floor(fullSeconds % 60));
            var mins = Math.max(0, Math.floor(fullSeconds / 60));
            $('[data-timer]').text(mins + ":" + (seconds < 10 ? '0' : '') + seconds);

            if (seconds <= 0 && mins <= 0) {
                var highest = null, someoneWon = false;

                $.each(engine.bots, function(i, bot) {
                    if (highest === null) {
                        highest = bot;
                    }
                    else if (bot.health > highest.health) {
                        someoneWon = true;
                        highest = bot;
                    }
                });

                if (someoneWon) {
                    $.each(engine.bots, function(i, bot) {
                        if (bot.id !== highest.id) {
                            bot.health = 0;
                            window.Renderer.botHit(bot);
                            window.Renderer.killBot(bot);
                        }
                    });
                    botWon(highest, null);
                }
                else {
                    draw();
                }
            }
        }

        if (_endedADraw) {
            return;
        }

        if (_replayRunning) {
            if (_replayStep >= 0 && _replayStep < _replayLength) {
                var replayData = _storedReplay[Math.floor(_replayStep)],
                    replayDataNext = _storedReplay[Math.ceil(_replayStep)],
                    percentage = _replayStep - Math.floor(_replayStep);

                if (_replayStepFirst) {
                    _storedEngine = { bots: $.extend(true, [], engine.bots), bullets: $.extend(true, [], engine.bullets) };

                    while (engine.bullets.length > 0) {
                        window.Renderer.hideBullet(engine.bullets[engine.bullets.length - 1]);
                        engine.bullets.pop();
                    }

                    $.each(replayData.bots, function(i, bot) {
                        if (bot.health > 0 && engine.bots[i].health <= 0) {
                            window.Renderer.unkillBot(engine.bots[i]);
                        }
                        engine.bots[i].health = bot.health;
                    });

                    $.each(replayData.bullets, function(i, bullet) {
                        var b = $.extend(true, [], bullet);
                        b.pos = b.pos.clone();
                        engine.bullets.push(b);
                        window.Renderer.addBullet(b);
                    });

                    _replayStepFirst = false;
                }
                else {
                    $.each(engine.bots, function(i, bot) {
                        if (replayDataNext) {
                            bot.pos.lerpVectors(replayData.bots[i].pos, replayDataNext.bots[i].pos, percentage);
                        }
                        else {
                            bot.pos.set(replayData.bots[i].pos.x, replayData.bots[i].pos.y);
                        }

                        if (replayData.bots[i].health < bot.health) {
                            bot.health = replayData.bots[i].health;
                            window.Renderer.botHit(bot);
                        }

                        if (bot.health <= 0)
                            window.Renderer.killBot(bot);
                    });

                    // Add/remove bullets
                    while (engine.bullets.length < replayData.bullets.length) {
                        var bullet = { pos: new Vector2(0, 0) };
                        engine.bullets.push(bullet);
                        window.Renderer.addBullet(bullet);
                    }
                    while (engine.bullets.length > replayData.bullets.length) {
                        window.Renderer.killBullet(engine.bullets.pop());
                    }

                    $.each(engine.bullets, function(i, bullet) {
                        if (replayDataNext) {
                            var bulletInNextFrame = null;
                            for (var j = 0, len = replayDataNext.bullets.length; j < len; j++) {
                                if (replayDataNext.bullets[j].id === replayData.bullets[i].id) {
                                    bulletInNextFrame = replayDataNext.bullets[j];
                                    break;
                                }
                            }

                            if (bulletInNextFrame) {
                                bullet.pos.lerpVectors(replayData.bullets[i].pos, bulletInNextFrame.pos, percentage);
                            }
                            else {
                                bullet.pos.set(replayData.bullets[i].pos.x, replayData.bullets[i].pos.y);
                            }
                        }
                        else {
                            bullet.pos.set(replayData.bullets[i].pos.x, replayData.bullets[i].pos.y);
                        }
                    });
                }
            }

            if (_replayStep < 0 || _replayStep >= _replayLength) {
                _replayStep = Math.round(_replayStep + 1);
            }
            else {
                var t = (_replayLength - _replayStep) / _replayLength,
                    A = _replayMinSpeed,
                    B = _replayMaxSpeed,
                    lerp = A + t * (B - A);
                _replayStep += lerp;
            }

            if (_replayStep >= _replayLength + _replayLengthExtraEnd) {
                _replayRunning = false;
                botWonReplayDone(_winnerBot);

                // Restore bullets
                $.each(engine.bullets, function(i, bullet) {
                    window.Renderer.killBullet(bullet);
                });

                engine.bullets = _storedEngine.bullets;
                $.each(engine.bullets, function(i, bullet) {
                    window.Renderer.showBullet(bullet);
                });
            }
        }
        else {
            var availableBullets = $.map(engine.bullets, function(b, i) {
                return {
                    bot: {
                        id: b.bot.id,
                        name: b.bot.bot.name,
                        pos: b.bot.pos,
                        health: b.bot.health,
                        prevCommand: b.bot.prevCommand,
                        prevPos: b.bot.prevPos
                    },
                    pos: b.pos.clone(),
                    dir: b.dir.clone(),
                    vel: b.vel.clone()
                }
            });

            engine.bullets = $.grep(engine.bullets, function(bullet, i) {
                bullet.pos.add(bullet.vel);

                // Is outside playing field?
                if (!pointInRectangle(bullet.pos, DESTROY_MIN_POS, DESTROY_MAX_POS)) {
                    window.Renderer.killBullet(bullet);
                    return false;
                }

                // Is hitting other player?
                var hitPlayer = null;
                $.each(engine.bots, function(i, bot) {
                    if (bot !== bullet.bot && pointInRectangle(bullet.pos, bot.topLeft, bot.btmRight) && bot.health > 0) {
                        bot.health--;
                        window.Renderer.botHit(bot);
                        if (bot.health <= 0)
                            window.Renderer.killBot(bot);
                        hitPlayer = bot;
                        return false;
                    }
                });
                if (hitPlayer) {
                    window.Renderer.killBullet(bullet);

                    var winner = null,
                        botsAlive = 0;
                    $.each(engine.bots, function(i, bot) {
                        if (bot.health > 0) {
                            winner = bot;
                            botsAlive++;
                        }
                    });
                    if (botsAlive === 1) {
                        botWon(winner, hitPlayer);
                    }
                    return false;
                }

                return true;
            });

            $.each(engine.bots, function(i, bot) {
                if (bot.health > 0) {
                    if (bot.reload > 0) bot.reload--;

                    var availableBots = $.map($.grep(engine.bots, function(b, i) {
                        return bot !== b;
                    }), function(b, i) {
                        return {
                            id: b.id,
                            name: b.bot.name,
                            pos: b.pos.clone(),
                            health: b.health,
                            prevCommand: b.prevCommand,
                            prevPos: (b.prevPos ? b.prevPos.clone() : b.prevPos)
                        }
                    });

                    var choice = DoNothing;
                    try {
                        choice = bot.bot.update(bot.pos.clone(), bot.health, bot.reload, availableBots, availableBullets);
                    }
                    catch(e) {
                        console.log(bot.bot.name + " got an error: " + e);
                    }
                    switch(choice.id) {
                        case _MoveUp:    bot.pos.y--; break;
                        case _MoveDown:  bot.pos.y++; break;
                        case _MoveLeft:  bot.pos.x--; break;
                        case _MoveRight: bot.pos.x++; break;
                        case _Shoot:
                            if (bot.reload <= 0) {
                                window.Renderer.addBullet( addBullet(bot, choice.value) );
                                bot.reload = RELOAD_FRAMES;
                            }
                            break;
                    }
                    bot.pos = bot.pos.clamp(MIN_POS, MAX_POS);
                    updateBounds(bot);
                    bot._prevCommand = choice;
                    bot._prevPos = bot.pos.clone();
                }
            });

            $.each(engine.bots, function(i, bot) {
                bot.prevCommand = bot._prevCommand;
                bot.prevPos = bot._prevPos;
            });

            // Store replay data
            var replayData = { bots: [], bullets: [] };

            $.each(engine.bots, function(i, bot) {
                replayData.bots.push({ bot: bot.bot, pos: bot.pos.clone(), health: bot.health });
            });

            $.each(engine.bullets, function(i, bullet) {
                replayData.bullets.push({ id: bullet.id, pos: bullet.pos.clone() });
            });

            _storedReplay.push(replayData);
            if (_storedReplay.length > _replayLength) _storedReplay.shift();
        }
    }

    function botWonReplayDone(bot) {
        if ($('.battlefield__winner').length === 0) {
            $('#battlefield').append($('<div class="battlefield__winner">').append($('<span>').text(bot.bot.name + ' won!')));
        }
    }

    function botWon(bot, lastKilledBot) {
        _winnerBot = bot;

        if (window.Renderer.showReplay(bot, lastKilledBot)) {
            _replayRunning = true;
            _replayStep = -_replayLengthExtraStart;
            _replayStepFirst = true;
        }
        else {
            botWonReplayDone(_winnerBot);
        }
        _gameOver = true;
    }

    function draw(bot) {
        if ($('.battlefield__winner').length === 0) {
            $('#battlefield').append($('<div class="battlefield__winner">').append($('<span>').text('Draw!')));
        }
        _gameOver = true;
        _endedADraw = true;
    }

    function animationCallback() {
        _firstTimePlaying = false;
        _runningInterval = setInterval(step, engine.getFps());
    }

    function play() {
        pause();

        if (_firstTimePlaying) {
            if (!window.Renderer.startingAnimation(animationCallback)) {
                animationCallback();
            }
        }
        else {
            _runningInterval = setInterval(step, engine.getFps());
        }

        $('[data-play]').addClass('disabled');
        $('[data-pause]').removeClass('disabled');
        $('[data-fps]').attr('disabled', 'disabled');
    }

    function pause() {
        if (typeof _runningInterval !== 'undefined') {
            clearInterval(_runningInterval);
        }

        $('[data-play]').removeClass('disabled');
        $('[data-pause]').addClass('disabled');
        $('[data-fps]').attr('disabled', null);
    }

    initRenderer();

    $('[data-play]').click(play.bind(this));
    $('[data-pause]').click(pause.bind(this));
    $('[data-bot]').click(function() {
        addBot($(this).attr('data-bot'));
    });
}(jQuery));
