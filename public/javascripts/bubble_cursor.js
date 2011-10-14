var BubbleCursor = (function () {
    var
        canvas,
        cursor,
        cursorExtension,
        hooks,
        shapes = [],
        targets = [],
        searchTree,
        selected
    ;

    // canvasParams = {container:string, width:int, height:int}
    // shapeParams = [
    //     {type:'circle', center:{x:int, y:int}, radius:int},
    //     {type:'rectangle', topLeft:{x:int, y:int}, height:int, width:int}
    //     {type:'polygon', vertices:[{x:int, y:int}, ...]},
    //     ...
    // ]
    // targetSequence (optional) = [int, ...]
    // handlers (optional) = {beforeStart:function, hit:function, miss:function, afterFinish:function}
    //
    // Polygon vertices are assumed to be in consecutive order.
    function init(canvasParams, useBubbleCursor, shapeParams, targetSequence, handlers) {
        canvas = new Raphael(canvasParams.container, canvasParams.width, canvasParams.height);

        cursor = canvas.circle(0, 0, 0);
        cursor.attr({
            fill:'#999',
            'stroke-opacity':0
        });
        cursorExtension = canvas.circle(0, 0, 0);
        cursorExtension.attr({
            fill:'#999',
            'stroke-opacity':0
        });
        var cursorGroup = canvas.group();
        cursorGroup.push(cursor);
        cursorGroup.push(cursorExtension);
        cursorGroup.attr({opacity:0.15});
        hooks = handlers || {};

        shapes = createShapes(shapeParams);
        cursorGroup.toFront();
        if (targetSequence)
            for (var targetNo = -1, numTargets = targetSequence.length; ++targetNo < numTargets;)
                targets.push(shapes[targetSequence[targetNo]]);
        if (useBubbleCursor)
            searchTree = new SearchTree(shapes, canvasParams.height, canvasParams.height);

        hooks.beforeStart && hooks.beforeStart();
        targetSequence && targets[0].shape.animate({fill:'#91ff75', stroke:'#bdebff'}, 300);
        if (useBubbleCursor) {
            var
                container = document.getElementById(canvasParams.container);
                cx = container.offsetLeft,
                cy = container.offsetTop
            ;
            canvas.canvas.onmousemove = function(event) {
                var x = 0, y = 0;
                if (!event) event = window.event;
                if (event.pageX || event.pageY) {
                    x = event.pageX;
                    y = event.pageY
                } else if (event.clientX || event.clientY) {
                    x = event.clientX;
                    y = event.clientY;
                }
                updateCursor(x - cx, y - cy);
            };
            canvas.canvas.onclick = targetSequence ?
                updateTarget :
                function() {
                    var clickedShape = selected.shape;
                    clickedShape.attr({fill:'#91ff75', stroke:'#27c200'});
                    clickedShape.animate({fill:'#f0fffc', stroke:'#bdebff'}, 250);
                }
            ;
        } else {
            var getClickHandler = targetSequence ?
                function(shape) {
                    return function(event) {
                        selected = shape;
                        updateTarget();
                        selected = null;
                    }
                } :
                function(shape) {
                    return function () {
                        if (shape) {
                            shapeObj = shape.shape;
                            shapeObj.attr({fill:'#91ff75', stroke:'#27c200'});
                            shapeObj.animate({fill:'#f0fffc', stroke:'#bdebff'}, 250);
                        }
                    }
                }
            ;
            for (var shapeNo = -1, numShapes = shapes.length; ++shapeNo < numShapes;) {
                var shape = shapes[shapeNo];
                shape.shape.node.onclick = getClickHandler(shape);
            }
            canvas.canvas.onclick = function(mouseEvent) {
                mouseEvent.target.tagName == 'svg' && getClickHandler()();
            }
        }
    }

    function createShapes(shapeParams) {
        var shapes = [];
        for (var shapeNo = -1, numShapes = shapeParams.length; ++shapeNo < numShapes;) {
            var shape = shapeParams[shapeNo];
            switch (shape.type) {
                case 'circle':
                    shapes.push({
                        shapeParams:shape,
                        shape:createCircle(shape)
                    });
                    break;
                case 'rectangle':
                    shapes.push({
                        shapeParams:shape,
                        shape:createRectangle(shape)
                    });
                    break;
                case 'polygon':
                    shapes.push({
                        shapeParams:shape,
                        shape:createPolygon(shape)
                    });
                    break;
            }
        }
        return shapes;
    }

    function createCircle(params) {
        var circle = canvas.circle(params.center.x, params.center.y, params.radius)
        circle.attr({fill:'#f0fffc', stroke:'#bdebff'});
        return circle;
    }

    function createRectangle(params) {
        var rectangle = canvas.rect(params.topLeft.x, params.topLeft.y, params.width, params.height)
        rectangle.attr({fill:'#f0fffc', stroke:'#bdebff'});
        return rectangle;
    }

    function createPolygon(params) {
        var
            vertices = params.vertices,
            start = vertices[0],
            pathString = 'M' + start.x + ' ' + start.y
        ;
        for (var vertexNo = -1, numVertices = vertices.length; ++vertexNo < numVertices;) {
            var vertex = vertices[vertexNo];
            pathString += 'L' + vertex.x + ' ' + vertex.y;
        }
        pathString += 'L' + start.x + ' ' + start.y;
        var polygon = canvas.path(pathString);
        polygon.attr({fill:'#f0fffc', stroke:'#bdebff'});
        return polygon;
    }

    function updateCursor(x, y) {
        cursor.attr({cx:x, cy:y});

        var nearestTargets = searchTree.findNearestNeighbors(x, y, 2);
        selected = nearestTargets[0];

        var
            enclosingDistance = Geometry.pointToShapeEnclosingDistance(x, y, selected.shapeParams),
            nextNearestTarget = nearestTargets[1],
            maxRadius = nextNearestTarget ? nextNearestTarget.distance : Infinity,
            needExtension = enclosingDistance > maxRadius,
            cursorRadius = needExtension ? maxRadius : enclosingDistance
        ;
        cursor.animate({r:cursorRadius}, 100);

        if (needExtension) {
            var spanningCircle = Geometry.spanningCircle(selected.shapeParams);
            cursorExtension.attr({
                cx:spanningCircle.center.x,
                cy:spanningCircle.center.y,
                r:spanningCircle.radius + (
                    selected.shapeParams.type == 'circle' ? 5 :
                    selected.shapeParams.type == 'rectangle' ? 3 :
                    0
                )
            });
        }
    }

    function updateTarget() {
        var clickedShape = selected && selected.shape;
        if (clickedShape === targets[0].shape) {
            clickedShape.animate({fill:'#f0fffc', stroke:'#bdebff'}, 250);
            hooks.hit && hooks.hit();
            targets.shift();
            if (targets.length) {
                targets[0].shape.animate({fill:'#91ff75', stroke:'#bdebff'}, 250);
            } else {
                canvas.canvas.onclick = undefined;
                hooks.afterFinish();
            }
        } else {
            if (clickedShape) {
                clickedShape.attr({fill:'#ff7591', stroke:'#c20027'});
                clickedShape.animate({fill:'#f0fffc', stroke:'#bdebff'}, 250);
            }
            hooks.miss && hooks.miss();
        }
    }

    return {
        init:init
    };
}) ();
