var SearchTree = (function() {
    /* Helper Classes */
    var TwoDTree = (function() {
        var klass = function (nodes) {
            this.buildTree(nodes)
        };

        // nodes = [{point:{x:int, y:int}, data:obj}, ...]
        klass.prototype.buildTree = function(nodes) {
            function buildSubTree(subNodes, splitDim) {
                if (subNodes.length) {
                    subNodes.sort(function (a, b) {return a.point[splitDim] - b.point[splitDim]});

                    var
                        medianNo = subNodes.length >> 1,
                        medianNode = subNodes[medianNo],
                        nextDim = splitDim === 'x' ? 'y' : 'x'
                    ;

                    return {
                        point:medianNode.point,
                        data:medianNode.data,
                        leftChild:buildSubTree(subNodes.slice(0, medianNo), nextDim),
                        rightChild:buildSubTree(subNodes.slice(medianNo + 1), nextDim)
                    }
                } else
                    return null;
            }
            this.tree = buildSubTree(nodes, 'x');
        };

        // return = [{point:{x:int, y:int}, distance:int, data:obj}, ...]
        klass.prototype.findNearestNeighbors = function(x, y, numNeighbors) {
            var nearestNeighbors = new Array(numNeighbors);

            function searchSubTree(root, splitDim) {
                var
                    subRoot,
                    otherSubRoot,
                    nextDim = splitDim === 'x' ? 'y' : 'x',
                    rootPoint = root.point,
                    rootDistance = Geometry.pointToPointDistance(x, y, rootPoint.x, rootPoint.y)
                ;
                if (splitDim === 'x' ? x <= rootPoint.x : y <= rootPoint.y) {
                    subRoot = root.leftChild,
                    otherSubRoot = root.rightChild
                } else {
                    subRoot = root.rightChild,
                    otherSubRoot = root.leftChild
                }

                nearestNeighbors.push({
                    point:rootPoint,
                    distance:rootDistance,
                    data:root.data
                });
                nearestNeighbors.sort(function (a, b) {return a.distance - b.distance});
                nearestNeighbors.length = numNeighbors;

                subRoot && searchSubTree(subRoot, nextDim);

                var
                    point = {x:x, y:y},
                    neighborNo = numNeighbors
                ;
                while (!nearestNeighbors[neighborNo]) neighborNo--;
                if (
                    otherSubRoot &&
                    (
                        neighborNo < numNeighbors ||
                        point[splitDim] - rootPoint[splitDim] < (nearestNeighbors[neighborNo].distance || Infinity)
                    )
                )
                    searchSubTree(otherSubRoot, nextDim);
            }
            searchSubTree(this.tree, 'x');
            return nearestNeighbors;
        };

        return klass;
    }) ();

    var Quadtree = (function() {
        var klass = function(nodes, height, width) {
            this.buildTree(nodes, height, width)
        };

        // nodes = [{boundingBox:{topLeft:{x:int, y:int}, height:int, width:int}, data:obj}, ...]
        klass.prototype.buildTree = function(nodes, height, width) {
            function buildSubTree(subNodes, x, y, height, width) {
                if (height && width) {
                    var rootPartitionBox = {
                        type:'rectangle',
                        topLeft:{x:x, y:y},
                        height:height,
                        width:width
                    };
                    if (subNodes.length < 2 || height == 1 || width == 1) {
                        return {
                            box:rootPartitionBox,
                            leaf:true,
                            shapes:subNodes
                        };
                    } else {
                        var
                            topLeftNodes = [],
                            topRightNodes = [],
                            bottomLeftNodes = [],
                            bottomRightNodes = [],
                            nextHeight = height >> 1,
                            nextWidth = width >> 1,
                            cx = x + nextWidth,
                            cy = y + nextHeight
                        ;
                        for (var subNodeNo = -1, numSubNodes = subNodes.length; ++subNodeNo < numSubNodes;) {
                            var
                                node = subNodes[subNodeNo],
                                nodeBox = node.boundingBox,
                                partitionBoxTopLeft = {x:x, y:y},
                                partitionBox = {
                                    type:'rectangle',
                                    topLeft:partitionBoxTopLeft,
                                    height:nextHeight,
                                    width:nextWidth
                                }
                            ;
                            if (Geometry.rectanglesOverlap(nodeBox, partitionBox)) topLeftNodes.push(node);
                            partitionBoxTopLeft.x = cx;
                            if (Geometry.rectanglesOverlap(nodeBox, partitionBox)) topRightNodes.push(node);
                            partitionBoxTopLeft.y = cy;
                            if (Geometry.rectanglesOverlap(nodeBox, partitionBox)) bottomRightNodes.push(node);
                            partitionBoxTopLeft.x = x;
                            if (Geometry.rectanglesOverlap(nodeBox, partitionBox)) bottomLeftNodes.push(node);
                        }
                        return {
                            box:rootPartitionBox,
                            topLeft:buildSubTree(topLeftNodes, x, y, nextHeight, nextWidth),
                            topRight:buildSubTree(topRightNodes, cx, y, nextHeight, nextWidth),
                            bottomLeft:buildSubTree(bottomLeftNodes, x, cy, nextHeight, nextWidth),
                            bottomRight:buildSubTree(bottomRightNodes, cx, cy, nextHeight, nextWidth)
                        }
                    }
                } else
                    return null;
            }

            for (var nodeNo = -1, numNodes = nodes.length; ++nodeNo < numNodes;)
                nodes[nodeNo].id = nodeNo;
            this.tree = buildSubTree(nodes, 0, 0, height, width);
        };

        // nodes = [{boundingBox:{topLeft:{x:int, y:int}, height:int, width:int}, data:obj}, ...]
        // queryBox should be a shapeParams for rectangle (as defined in the Geometry module).
        klass.prototype.query = function(queryBox) {
            var
                nodes = [],
                searchedNodeLookup = {}
            ;
            function querySubTree(root) {
                if (root.leaf) {
                    var shapes = root.shapes;
                    for (var shapeNo = -1, numShapes = shapes.length; ++shapeNo < numShapes;) {
                        var shape = shapes[shapeNo];
                        if (!searchedNodeLookup[shape.id]) {
                            nodes.push(shape);
                            searchedNodeLookup[shape.id] = true;
                        }
                    }
                } else {
                    var
                        topLeft = root.topLeft,
                        topRight = root.topRight,
                        bottomLeft = root.bottomLeft,
                        bottomRight = root.bottomRight
                    ;
                    if (topLeft && Geometry.rectanglesOverlap(queryBox, topLeft.box))
                        querySubTree(topLeft);
                    if (topRight && Geometry.rectanglesOverlap(queryBox, topRight.box))
                        querySubTree(topRight);
                    if (bottomLeft && Geometry.rectanglesOverlap(queryBox, bottomLeft.box))
                        querySubTree(bottomLeft);
                    if (bottomRight && Geometry.rectanglesOverlap(queryBox, bottomRight.box))
                        querySubTree(bottomRight);
                }
            }
            querySubTree(this.tree);
            return nodes;
        };

        return klass;
    }) ();

    var klass = function(nodes, height, width) {
        this.buildTree(nodes, height, width)
    };

    // nodes = [{shapeParams:obj, shape:obj}, ...]
    // shapeParams is as defined in the Geometry module.
    klass.prototype.buildTree = function(nodes, height, width) {
        for (var nodeNo = -1, numNodes = nodes.length; ++nodeNo < numNodes;) {
            var node = nodes[nodeNo];
            nodes[nodeNo] = {
                boundingBox:Geometry.boundingBox(node.shapeParams),
                point:Geometry.centroid(node.shapeParams),
                data:node
            }
        }
        this.twoDTree = new TwoDTree(nodes);
        this.quadtree = new Quadtree(nodes, height, width);
    };

    klass.prototype.findNearestNeighbors = function(x, y, numNeighbors) {
        var
            bestGuess = this.twoDTree.findNearestNeighbors(x, y, numNeighbors),
            candidates = this.quadtree.query(Geometry.boundingBox({
                type:'circle',
                center:{x:x, y:y},
                radius:bestGuess[numNeighbors - 1].distance
            }))
        ;
        for (
            var
                candidateNo = -1,
                numCandidates = candidates.length
            ;
            ++candidateNo < numCandidates;
        ) {
            var data = candidates[candidateNo].data;
            candidates[candidateNo] = data;
            data.distance = Geometry.pointToShapeDistance(x, y, data.shapeParams);
        }
        candidates.sort(function (a, b) {
            return a.distance - b.distance
        });
        candidates.length = numNeighbors;
        return candidates;
    };

    return klass;
}) ();
