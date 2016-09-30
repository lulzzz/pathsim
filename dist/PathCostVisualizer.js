System.register(["lodash"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var _;
    var PathCostVisualizer;
    return {
        setters:[
            function (_1) {
                _ = _1;
            }],
        execute: function() {
            class PathCostVisualizer {
                constructor(map) {
                    this.map = map;
                }
                paint() {
                    var distanceMulti = 1 / _.maxBy(this.map.cells.filter(cell => cell.isVisited && Number.isFinite(cell.distance)), cell => cell.distance).distance;
                    this.map.cells.filter(cell => cell.isVisited).forEach(cell => {
                        cell.color = this.numberToColorHsl(1 - (cell.distance * distanceMulti), 0, 1);
                    });
                }
                numberToColorHsl(i, min, max) {
                    var ratio = i;
                    if (min > 0 || max < 1) {
                        if (i < min) {
                            ratio = 0;
                        }
                        else if (i > max) {
                            ratio = 1;
                        }
                        else {
                            var range = max - min;
                            ratio = (i - min) / range;
                        }
                    }
                    var hue = ratio * 1.2 / 3.60;
                    var rgb = this.hslToRgb(hue, 1, 0.5);
                    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
                }
                hue2rgb(p, q, t) {
                    if (t < 0)
                        t += 1;
                    if (t > 1)
                        t -= 1;
                    if (t < 1 / 6)
                        return p + (q - p) * 6 * t;
                    if (t < 1 / 2)
                        return q;
                    if (t < 2 / 3)
                        return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                }
                hslToRgb(h, s, l) {
                    var r, g, b;
                    if (s === 0) {
                        r = g = b = l;
                    }
                    else {
                        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        var p = 2 * l - q;
                        r = this.hue2rgb(p, q, h + 1 / 3);
                        g = this.hue2rgb(p, q, h);
                        b = this.hue2rgb(p, q, h - 1 / 3);
                    }
                    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
                }
            }
            exports_1("PathCostVisualizer", PathCostVisualizer);
        }
    }
});
//# sourceMappingURL=PathCostVisualizer.js.map