console.log("3d Renderer");

window.Renderer = (function($) {
    var $arena = $('#battlefield'),
        _winnerBot,
        _loserBot,
        _cameraPercentage = 1,
        _cameraFrom,
        _cameraTo;

    function degInRad(deg) {
        return deg * Math.PI / 180;
    }

    return {
        init: function(engine) {
            this._engine = engine;

            var width = BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH,
                height = BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 2000 );
            this.camera.up = new THREE.Vector3(0,0,1);

            this.renderer = new THREE.WebGLRenderer();
            this.renderer.setClearColor( 0xf0f0f0 );
            this.renderer.setSize(width, height);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMapSoft = true;

            this.renderer.shadowCameraNear = 0.1;
            this.renderer.shadowCameraFar = this.camera.far;
            this.renderer.shadowCameraFov = 50;

            this.renderer.shadowMapBias = 0.0039;
            this.renderer.shadowMapDarkness = 0.5;
            this.renderer.shadowMapWidth = 1024;
            this.renderer.shadowMapHeight = 1024;
            $('#battlefield').append( this.renderer.domElement );

            this.sceneParent = new THREE.Object3D();
            this.sceneParent.position.set(BotBattle.ARENA_WIDTH / -2, BotBattle.ARENA_HEIGHT / -2, 0);
            this.scene.add(this.sceneParent);

            // this.scene.add( new THREE.AmbientLight( 0x212223 ) );
            var light = new THREE.DirectionalLight( 0xffffff, 0.5 );
            light.castShadow = true;
            light.shadowDarkness = 0.5;
            light.position.set( 300, 300, 300 );
            this.scene.add( light );

            var light = new THREE.SpotLight( 0xffffff, 0.2, 0 );
            light.position.set( 0, 0, 600 );

            light.castShadow = true;
            light.shadowDarkness = 0.5;

            this.scene.add( light );

            // var cameraHelper = new THREE.CameraHelper( light.shadow.camera );
            // this.scene.add( cameraHelper );

            var plane = new THREE.Mesh(
                new THREE.BoxGeometry( BotBattle.ARENA_WIDTH, BotBattle.ARENA_HEIGHT, 1 ),
                new THREE.MeshPhongMaterial( { color: 0xeeeeee } )
            );
            plane.receiveShadow = true;
            plane.position.set(BotBattle.ARENA_WIDTH / 2, BotBattle.ARENA_HEIGHT / 2, -16);
            this.sceneParent.add(plane);

            var plane = new THREE.Mesh(
                new THREE.BoxGeometry( BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH, BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT, 1 ),
                new THREE.MeshLambertMaterial( { color: 0xcccccc } )
            );
            plane.receiveShadow = true;
            plane.position.set(BotBattle.ARENA_WIDTH / 2, BotBattle.ARENA_HEIGHT / 2, -17);
            this.sceneParent.add(plane);

            this._addWall(
                -BotBattle.BOT_WIDTH,
                BotBattle.ARENA_HEIGHT / 2,
                32,
                BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT);
            this._addWall(
                BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH,
                BotBattle.ARENA_HEIGHT / 2,
                32,
                BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT);
            this._addWall(
                BotBattle.ARENA_WIDTH / 2,
                -BotBattle.BOT_HEIGHT,
                BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH * 3,
                32);
            this._addWall(
                BotBattle.ARENA_WIDTH / 2,
                BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT,
                BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH * 3,
                32);

            $arena.append($('<a data-fullscreen class="battlefield__fullscreen">Fullscreen</a>')
                .click(this._toggleFullscreen.bind(this)));

            this._setOriginalCamera(true);
            this._render();
        },

        _toggleFullscreen: function() {
            var _this = this;

            if ($('.battlefield-wrapper').hasClass('_fullscreen')) {
                $('.battlefield-wrapper').removeClass('_fullscreen');
                $(window).off('resize.fullscreen');

                var width = BotBattle.ARENA_WIDTH + BotBattle.BOT_WIDTH,
                    height = BotBattle.ARENA_HEIGHT + BotBattle.BOT_HEIGHT;

                _this.camera.aspect = width / height;
                _this.camera.updateProjectionMatrix();
                _this.renderer.setSize( width, height );
            }
            else {
                $('.battlefield-wrapper').addClass('_fullscreen');

                $(window).on('resize.fullscreen', function() {
                    _this.camera.aspect = window.innerWidth / window.innerHeight;
                    _this.camera.updateProjectionMatrix();
                    _this.renderer.setSize( window.innerWidth, window.innerHeight );
                });
                $(window).resize();
            }
        },

        _setOriginalCamera: function(reset) {
            this.camera.position.x = 0;
            this.camera.position.y = -500;
            this.camera.position.z = 500;
            this.camera.lookAt(this.scene.position);
            this.camera.position.y = -700;

            _cameraTo = {
                quaternion: this.camera.quaternion.clone(),
                position: this.camera.position.clone()
            };

            if (reset) {
                _cameraFrom = {
                    quaternion: this.camera.quaternion.clone(),
                    position: this.camera.position.clone()
                };
            }
        },

        _addWall: function(x, y, width, height) {
            var wall = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, 30),
                new THREE.MeshPhongMaterial( { color: 0x666666 } )
            );
            wall.position.set(x, y, -18);
            this.sceneParent.add(wall);
        },

        addBullet: function(bullet) {
            var geometry = new THREE.SphereGeometry( 4, 4, 4 );
            var material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
            var mesh = new THREE.Mesh( geometry, material );
            mesh.position.y = BotBattle.ARENA_HEIGHT;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.sceneParent.add(mesh);

            bullet.mesh = mesh;
            this._updatePos(bullet);
        },

        killBullet: function(bullet) {
            this.sceneParent.remove(bullet.mesh);
        },

        hideBullet: function(bullet) {
            bullet.mesh.visible = false;
        },

        showBullet: function(bullet) {
            bullet.mesh.visible = true;
        },

        addBot: function(bot) {
            var geometry = new THREE.BoxGeometry( BotBattle.BOT_WIDTH, BotBattle.BOT_WIDTH, BotBattle.BOT_WIDTH );
            var material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );
            var mesh = new THREE.Mesh( geometry, material );
            mesh.position.y = BotBattle.ARENA_HEIGHT;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.sceneParent.add(mesh);

            var _this = this;
            new THREE.TextureLoader().load(
                bot.bot.image,
                function ( texture ) {
                    new THREE.TextureLoader().load(
                        (typeof bot.bot.lightmap !== 'undefined' ? bot.bot.lightmap : '/img/lightmap.png'),
                        function ( lightmap ) {
                            var material = new THREE.MeshPhongMaterial( {
                                map: texture,
                                lightMap: lightmap
                            } );
                            mesh.material = material;
                        }
                    );
                }
            );

            // var healthbarbar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xcccccc }));
            // healthbarbar.scale.set(32, 3, 1);
            // healthbarbar.position.set(0, 10.1, 30);
            // mesh.add( healthbarbar );

            var healthbar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x8cad6c }));
            healthbar.scale.set(32, 3, 1);
            healthbar.position.set(0, 0, 30);
            mesh.add( healthbar );

            bot.mesh = mesh;
            bot.healthbar = healthbar;
            this._updatePos(bot);
        },

        botHit: function(bot) {
            bot.healthbar.scale.x = 32 * (bot.health / BotBattle.MAX_HEALTH);
            bot.healthbar.position.x = -16 + 16 * (bot.health / BotBattle.MAX_HEALTH);
        },

        unkillBot: function(bot) {
            bot.mesh.material.transparent = false;
            bot.mesh.material.opacity = 1;
        },

        killBot: function(bot) {
            bot.mesh.material.transparent = true;
            bot.mesh.material.opacity = 0.3;
        },

        showReplay: function(winnerBot, loserBot) {
            var _this = this;

            if (!loserBot) {
                return false;
            }

            _winnerBot = winnerBot;
            _loserBot = loserBot;
            _cameraPercentage = 0;
            _cameraFrom = {
                quaternion: this.camera.quaternion.clone(),
                position: this.camera.position.clone()
            };
            _cameraTo = {
                quaternion: this.camera.quaternion.clone(),
                position: this.camera.position.clone()
            };

            function step() {
                var diff = _loserBot.pos.clone().sub(_winnerBot.pos);

                _this.camera.position.set(_loserBot.pos.x - 400 + diff.x / 2,
                    400 - _loserBot.pos.y - diff.y / 2,
                    200);
                _this.camera.lookAt(new THREE.Vector3(_winnerBot.pos.x - 400, 400 - _winnerBot.pos.y, 0));

                _cameraTo.position = _this.camera.position.clone();
                _cameraTo.quaternion = _this.camera.quaternion.clone();

                _cameraPercentage += 0.005;
                if (_cameraPercentage >= 1) {
                    _cameraPercentage = 1;
                }
            }
            this._cameraInterval = setInterval(step, this._engine.getFps());

            return true;
        },

        startingAnimation: function(callback) {
            var _this = this;

            var currentAnimatingIndex = 0;
            var animationTimer = 0;
            var timeout = 300;

            // callback();
            // return true;
            _cameraFrom = {
                quaternion: this.camera.quaternion.clone(),
                position: this.camera.position.clone()
            };

            function step() {
                var bot = _this._engine.bots[currentAnimatingIndex],
                    percentage = animationTimer / timeout;

                if (animationTimer === 0) {
                    $('.battlefield__name').remove();
                    $arena.append($('<div class="battlefield__name">').text(bot.bot.name));
                }

                _cameraPercentage = Math.min(1, percentage * 3);

                _this.camera.position.x = (bot.pos.x - 400) * 0.6 - 15 + percentage * 30;
                _this.camera.position.y = (400 - bot.pos.y) * 0.6 - 15 + percentage * 30;
                _this.camera.position.z = 100;
                _this.camera.lookAt(new THREE.Vector3(bot.pos.x - 400, 400 - bot.pos.y, 0));

                _cameraTo.position = _this.camera.position.clone();
                _cameraTo.quaternion = _this.camera.quaternion.clone();

                if (animationTimer >= timeout) {
                    currentAnimatingIndex++;
                    animationTimer = -1;

                    _cameraFrom.position = _cameraTo.position.clone();
                    _cameraFrom.quaternion = _cameraTo.quaternion.clone();

                    if (currentAnimatingIndex >= _this._engine.bots.length) {
                        $('.battlefield__name').remove();
                        _this._setOriginalCamera(false);
                        _this._startCameraAnimation(0.008);
                        callback();
                        clearInterval(_this._animationInterval);
                    }
                }

                animationTimer++;
            }
            this._animationInterval = setInterval(step, this._engine.getFps());

            return true;
        },

        _startCameraAnimation: function(speed) {
            var _speed = speed, _this = this;

            _cameraPercentage = 0;

            function step() {
                _cameraPercentage += _speed;

                if (_cameraPercentage >= 1) {
                    _cameraPercentage = 1;
                    clearInterval(_this._cameraInterval);
                }
            }

            this._cameraInterval = setInterval(step, this._engine.getFps());
        },

        _render: function() {
            var _this = this;

            $.each(this._engine.bullets, function(i, bullet) {
                _this._updatePos(bullet);
            });
            $.each(this._engine.bots, function(i, bot) {
                _this._updatePos(bot);
            });

            _this.camera.position.lerpVectors(_cameraFrom.position, _cameraTo.position, _cameraPercentage);
            _this.camera.quaternion.copy(_cameraFrom.quaternion).slerp(_cameraTo.quaternion, _cameraPercentage);

            this.renderer.render( this.scene, this.camera );
            requestAnimationFrame(this._render.bind(this));
        },

        _getEntityScenePosition: function(entity) {
            return new THREE.Vector3(entity.pos.x, BotBattle.ARENA_HEIGHT - entity.pos.y, 0);
        },

        _updatePos: function(entity) {
            if (typeof entity.mesh !== 'undefined') {
                var p = this._getEntityScenePosition(entity);
                entity.mesh.position.x = p.x;
                entity.mesh.position.y = p.y;
            }
        }
    };
}(jQuery));
