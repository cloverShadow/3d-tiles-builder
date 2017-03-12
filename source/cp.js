var cesium = require('cesium');
var defined = cesium.defined;
var Matrix4 = cesium.Matrix4;
var Cartesian3 = cesium.Cartesian3;
var Quaternion = cesium.Quaternion;
var BoundingSphere = cesium.BoundingSphere;
var Matrix3 = cesium.Matrix3;
var CesiumMath = cesium.Math;

var nodeTranslationScratch = new Cartesian3();
var nodeQuaternionScratch = new Quaternion();
var nodeScaleScratch = new Cartesian3();
var aMinScratch = new Cartesian3();
var aMaxScratch = new Cartesian3();
var yUpToZUp = Matrix4.fromRotationTranslation(Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO));


function computeBoundingSphere(gltf) {
    var gltfNodes = gltf.nodes;
    var gltfMeshes = gltf.meshes;
    var rootNodes = gltf.scenes[gltf.scene].nodes;
    var rootNodesLength = rootNodes.length;

    var nodeStack = [];

    var min = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var max = new Cartesian3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

    for (var i = 0; i < rootNodesLength; ++i) {
        var n = gltfNodes[rootNodes[i]];
        n._transformToRoot = getTransform(n);
        nodeStack.push(n);

        while (nodeStack.length > 0) {
            n = nodeStack.pop();
            var transformToRoot = n._transformToRoot;

            var meshes = n.meshes;
            if (defined(meshes)) {
                var meshesLength = meshes.length;
                for (var j = 0; j < meshesLength; ++j) {
                    var primitives = gltfMeshes[meshes[j]].primitives;
                    var primitivesLength = primitives.length;
                    for (var m = 0; m < primitivesLength; ++m) {
                        var positionAccessor = primitives[m].attributes.POSITION;
                        if (defined(positionAccessor)) {
                            var minMax = getAccessorMinMax(gltf, positionAccessor);
                            var aMin = Cartesian3.fromArray(minMax.min, 0, aMinScratch);
                            var aMax = Cartesian3.fromArray(minMax.max, 0, aMaxScratch);
                            if (defined(min) && defined(max)) {
                                Matrix4.multiplyByPoint(transformToRoot, aMin, aMin);
                                Matrix4.multiplyByPoint(transformToRoot, aMax, aMax);
                                Cartesian3.minimumByComponent(min, aMin, min);
                                Cartesian3.maximumByComponent(max, aMax, max);
                            }
                        }
                    }
                }
            }

            var children = n.children;
            var childrenLength = children.length;
            for (var k = 0; k < childrenLength; ++k) {
                var child = gltfNodes[children[k]];
                child._transformToRoot = getTransform(child);
                Matrix4.multiplyTransformation(transformToRoot, child._transformToRoot, child._transformToRoot);
                nodeStack.push(child);
            }
            delete n._transformToRoot;
        }
    }

    var boundingSphere = BoundingSphere.fromCornerPoints(min, max);
    return BoundingSphere.transformWithoutScale(boundingSphere, yUpToZUp, boundingSphere);
}

function getTransform(node) {
    if (defined(node.matrix)) {
        return Matrix4.fromArray(node.matrix);
    }

    return Matrix4.fromTranslationQuaternionRotationScale(
        Cartesian3.fromArray(node.translation, 0, nodeTranslationScratch),
        Quaternion.unpack(node.rotation, 0, nodeQuaternionScratch),
        Cartesian3.fromArray(node.scale, 0 , nodeScaleScratch));
}

function getAccessorMinMax(gltf, accessorId) {
    var accessor = gltf.accessors[accessorId];
    var extensions = accessor.extensions;
    var accessorMin = accessor.min;
    var accessorMax = accessor.max;
    // If this accessor is quantized, we should use the decoded min and max
    if (defined(extensions)) {
        var quantizedAttributes = extensions.WEB3D_quantized_attributes;
        if (defined(quantizedAttributes)) {
            accessorMin = quantizedAttributes.decodedMin;
            accessorMax = quantizedAttributes.decodedMax;
        }
    }
    return {
        min : accessorMin,
        max : accessorMax
    };
}

module.exports = computeBoundingSphere;