// The shapeParams argument can take the following forms:
// Circles
//     {type:'circle', center:{x:int, y:int}, radius:int}
// Rectangles:
//     {type:'rectangle', topLeft:{x:int, y:int}, height:int, width:int}
// Polygons:
//     {type:'polygon', vertices:[{x:int, y:int}, ...]}
//     Vertices are assumed sequential.
var Geometry = (function () {
    function boundingBox(shapeParams) {
        switch(shapeParams.type) {
            case 'circle': return circleBoundingBox(shapeParams);
            case 'rectangle': return rectangleBoundingBox(shapeParams);
            case 'polygon': return polygonBoundingBox(shapeParams);
            default: return null;
        }
    }

    function centroid(shapeParams) {
        switch(shapeParams.type) {
            case 'circle': return circleCentroid(shapeParams);
            case 'rectangle': return rectangleCentroid(shapeParams);
            case 'polygon': return polygonCentroid(shapeParams);
            default: return null;
        }
    }

    function orthogonalProjection(x, y, x1, y1, x2, y2) {
        var
            lineSlope = (y1 - y2) / (x1 - x2),
            lineIntercept = y1 - lineSlope * x1,
            normSlope = -1 / lineSlope,
            normIntercept = y - normSlope * x,
            projX = (normIntercept - lineIntercept) / (lineSlope - normSlope),
            projY = lineSlope * projX + lineIntercept
        ;
        return {x:projX, y:projY};
    }

    function pointToPointDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    function pointToShapeDistance(x, y, shapeParams) {
        switch (shapeParams.type) {
            case 'circle': return circleDistances(x, y, shapeParams).shortest;
            case 'rectangle': return rectangleDistances(x, y, shapeParams).shortest;
            case 'polygon': return polygonDistances(x, y, shapeParams).shortest;
            default: return null;
        }
    }

    function pointToShapeEnclosingDistance(x, y, shapeParams) {
        switch (shapeParams.type) {
            case 'circle': return circleDistances(x, y, shapeParams).enclosing;
            case 'rectangle': return rectangleDistances(x, y, shapeParams).enclosing;
            case 'polygon': return polygonDistances(x, y, shapeParams).enclosing;
            default: return null;
        }
    }

    function pointOnSegment(x, y, x1, y1, x2, y2) {
        return (
            (x1 < x2 ? x >= x1 && x <= x2 : x >= x2 && x <= x1) &&
            (y1 < y2 ? y >= y1 && y <= y2 : y >= y2 && y <= y1)
        )
    }

    function rectanglesOverlap(shapeParams1, shapeParams2) {
        var
            ax1 = shapeParams1.topLeft.x, ay1 = shapeParams1.topLeft.y,
            ax2 = ax1 + shapeParams1.width, ay2 = ay1 + shapeParams1.height,
            bx1 = shapeParams2.topLeft.x, by1 = shapeParams2.topLeft.y,
            bx2 = bx1 + shapeParams2.width, by2 = by1 + shapeParams2.height
        ;
        return !(ay1 > by2 || ax2 < bx1 || ay2 < by1 || ax1 > bx2);
    }

    // A fast approximation using a bounding box
    function spanningCircle(shapeParams) {
        switch(shapeParams.type) {
            case 'circle': return shapeParams;
            case 'rectangle': return rectangleSpanningCircle(shapeParams);
            case 'polygon': return polygonSpanningCircle(shapeParams);
            default: return null;
        }
    }

    /* Shape-Specific Helpers */
    function circleBoundingBox(shapeParams) {
        var
            center = shapeParams.center,
            radius = shapeParams.radius,
            diameter = 2 * radius
        ;
        return {
            type:'rectangle',
            topLeft:{x:center.x - radius, y:center.y - radius},
            height:diameter,
            width:diameter
        }
    }

    function circleCentroid(shapeParams) {
        return shapeParams.center;
    }

    function circleDistances(x, y, shapeParams) {
        var
            center = shapeParams.center,
            toRadius = pointToPointDistance(x, y, center.x, center.y)
        ;
        return {
            shortest:toRadius <= shapeParams.radius ? 0 : toRadius - shapeParams.radius,
            enclosing:toRadius + shapeParams.radius
        };
    }

    function rectangleBoundingBox(shapeParams) {
        return {
            type:'rectangle',
            topLeft:shapeParams.topLeft,
            height:shapeParams.height,
            width:shapeParams.width
        };
    }

    function rectangleCentroid(shapeParams) {
        return {
            x:shapeParams.topLeft.x + (shapeParams.width >> 1),
            y:shapeParams.topLeft.y + (shapeParams.height >> 1)
        }
    }

    function rectangleDistances(x, y, shapeParams) {
        var
            topLeftX = shapeParams.topLeft.x,
            topLeftY = shapeParams.topLeft.y,
            height = shapeParams.height,
            width = shapeParams.width,
            left = x < topLeftX,
            right = x > topLeftX + width,
            center = !(left || right),
            up = y < topLeftY,
            down = y > topLeftY + height,
            middle = !(up || down)
        ;
        if (center && middle)
            return {
                shortest:0,
                enclosing:Math.max(
                    pointToPointDistance(x, y, topLeftX + width, topLeftY),
                    pointToPointDistance(x, y, topLeftX + width, topLeftY + height),
                    pointToPointDistance(x, y, topLeftX, topLeftY + height),
                    pointToPointDistance(x, y, topLeftX, topLeftY)
                )
            };
        else if (center && up)
            return {
                shortest:topLeftY - y,
                enclosing:Math.max(
                    pointToPointDistance(x, y, topLeftX + width, topLeftY + height),
                    pointToPointDistance(x, y, topLeftX, topLeftY + height)
                )
            };
        else if (right && up)
            return {
                shortest:pointToPointDistance(x, y, topLeftX + width, topLeftY),
                enclosing:pointToPointDistance(x, y, topLeftX, topLeftY + height)
            };
        else if (right && middle)
            return {
                shortest:x - topLeftX - width,
                enclosing:Math.max(
                    pointToPointDistance(x, y, topLeftX, topLeftY + height),
                    pointToPointDistance(x, y, topLeftX, topLeftY)
                )
            };
        else if (right && down)
            return {
                shortest:pointToPointDistance(x, y, topLeftX + width, topLeftY + height),
                enclosing:pointToPointDistance(x, y, topLeftX, topLeftY)
            };
        else if (center && down)
            return {
                shortest:y - topLeftY - height,
                enclosing:Math.max(
                    pointToPointDistance(x, y, topLeftX + width, topLeftY),
                    pointToPointDistance(x, y, topLeftX, topLeftY)
                )
            };
        else if (left && down)
            return {
                shortest:pointToPointDistance(x, y, topLeftX, topLeftY + height),
                enclosing:pointToPointDistance(x, y, topLeftX + width, topLeftY)
            };
        else if (left && middle)
            return {
                shortest:topLeftX - x,
                enclosing:Math.max(
                    pointToPointDistance(x, y, topLeftX + width, topLeftY),
                    pointToPointDistance(x, y, topLeftX + width, topLeftY + height)
                )
            };
        else // left && up
            return {
                shortest:pointToPointDistance(x, y, topLeftX, topLeftY),
                enclosing:pointToPointDistance(x, y, topLeftX + width, topLeftY + height)
            };
    }

    function rectangleSpanningCircle(shapeParams) {
        var center = centroid(shapeParams);
        return {
            type:'circle',
            center:center,
            radius:Math.sqrt(Math.pow(shapeParams.width / 2, 2) + Math.pow(shapeParams.height / 2, 2))
        }
    }

    function polygonBoundingBox(shapeParams) {
        var
            x1 = Infinity,
            y1 = Infinity,
            x2 = 0,
            y2 = 0,
            vertices = shapeParams.vertices
        ;
        for (var vertexNo = -1, numVertices = vertices.length; ++vertexNo < numVertices;) {
            var
                vertex = vertices[vertexNo],
                x = vertex.x,
                y = vertex.y
            ;
            if (x < x1) x1 = x;
            if (x > x2) x2 = x;
            if (y < y1) y1 = y;
            if (y > y2) y2 = y;
        }
        return {
            type:'rectangle',
            topLeft:{x:x1, y:y1},
            height:y2 - y1,
            width:x2 - x1
        }
    }

    function polygonCentroid(shapeParams) {
        var
            vertices = shapeParams.vertices,
            numVertices = vertices.length,
            area = 0,
            x = 0,
            y = 0
        ;
        for (var vertexNo = -1; ++vertexNo < numVertices;) {
            var
                vertex = vertices[vertexNo],
                nextVertex = vertices[(vertexNo + 1) % numVertices],
                commonTerm = (vertex.x * nextVertex.y - nextVertex.x * vertex.y)
            ;
            area += commonTerm;
            x += (vertex.x + nextVertex.x) * commonTerm;
            y += (vertex.y + nextVertex.y) * commonTerm;
        }
        area >>= 1;
        x /= 6 * area;
        y /= 6 * area;
        return {x:x, y:y};
    }

    function polygonDistances(x, y, shapeParams) {
        var
            vertices = shapeParams.vertices,
            numVertices = vertices.length,
            shortest = Infinity,
            enclosing = 0
        ;

        for (var vertexNo = -1; ++vertexNo < numVertices;) {
            var
                vertex = vertices[vertexNo],
                vx1 = vertex.x,
                vy1 = vertex.y,
                nextVertex = vertices[(vertexNo + 1) % numVertices],
                vx2 = nextVertex.x,
                vy2 = nextVertex.y,
                toVertex = pointToPointDistance(x, y, vx1, vy1),
                projection = orthogonalProjection(x, y, vx1, vy1, vx2, vy2),
                px = projection.x,
                py = projection.y
            ;
            if (toVertex < shortest)
                shortest = toVertex;
            if (toVertex > enclosing)
                enclosing = toVertex;
            if (pointOnSegment(px, py, vx1, vy1, vx2, vy2)) {
                var lineDistance = pointToPointDistance(x, y, px, py);
                if (lineDistance < shortest)
                    shortest = lineDistance;
                if (lineDistance > enclosing)
                    enclosing = lineDistance;
            }
        }
        return {shortest:shortest, enclosing:enclosing};
    }

    function polygonSpanningCircle(shapeParams) {
        var
            box = boundingBox(shapeParams),
            center = centroid(box)
        ;
        return {
            type:'circle',
            center:center,
            radius:Math.sqrt(Math.pow(box.width / 2, 2) + Math.pow(box.height / 2, 2))
        }
    }

    /* Public Methods */
    return {
        boundingBox:boundingBox,
        centroid:centroid,
        orthogonalProjection:orthogonalProjection,
        pointToPointDistance:pointToPointDistance,
        pointToShapeDistance:pointToShapeDistance,
        pointToShapeEnclosingDistance:pointToShapeEnclosingDistance,
        rectanglesOverlap:rectanglesOverlap,
        spanningCircle:spanningCircle
    }
}) ();
