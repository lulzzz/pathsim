System.register(["../grid/index", "./PathAlgorithm", "./Distance", "./../tools/index", './../tools/SimplePriorityQueue'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var index_1, PathAlgorithm_1, Distance_1, index_2, SimplePriorityQueue_1;
    var GAAStar;
    return {
        setters:[
            function (index_1_1) {
                index_1 = index_1_1;
            },
            function (PathAlgorithm_1_1) {
                PathAlgorithm_1 = PathAlgorithm_1_1;
            },
            function (Distance_1_1) {
                Distance_1 = Distance_1_1;
            },
            function (index_2_1) {
                index_2 = index_2_1;
            },
            function (SimplePriorityQueue_1_1) {
                SimplePriorityQueue_1 = SimplePriorityQueue_1_1;
            }],
        execute: function() {
            GAAStar = class GAAStar extends PathAlgorithm_1.PathAlgorithm {
                constructor(map, visibiltyRange) {
                    super();
                    this.map = map;
                    this.visibiltyRange = visibiltyRange;
                    this.initialized = false;
                    this.closedCells = new SimplePriorityQueue_1.SimplePriorityQueue((a, b) => a - b, 0);
                    this.openCells = new SimplePriorityQueue_1.SimplePriorityQueue((a, b) => a - b, 0);
                    this.goal = this.map.getGoalCell();
                    this.start = this.map.getStartCell();
                    this.currentCell = this.start;
                    this.searches = new index_2.TypMappedDictionary(cell => this.map.getIndexOfCell(cell), 0);
                    this.next = new index_2.TypMappedDictionary(cell => this.map.getIndexOfCell(cell));
                    this.parent = new index_2.TypMappedDictionary(cell => this.map.getIndexOfCell(cell));
                    this.robot = new index_1.Moveable(map, index_1.CellType.Current);
                }
                calculatePath(start, goal) {
                    this.init();
                    this.start = start;
                    this.goal = goal;
                    this.counter++;
                    let s = this.aStar(this.start);
                    if (s === null) {
                        throw new Error("goal is not reachable");
                    }
                    let cells = this.getNeighbors(s, (x) => this.closedCells.has(x));
                    cells.forEach(cell => {
                        cell.estimatedDistance = s.distance + s.estimatedDistance - cell.distance;
                    });
                    this.buildPath(s);
                    return this.next.get(this.start);
                }
                init() {
                    if (this.initialized)
                        return;
                    this.initialized = true;
                    this.counter = 0;
                    this.map.cells.forEach(cell => {
                        this.searches.set(cell, 0);
                        cell.estimatedDistance = this.distance(cell, this.goal);
                        this.next.delete(cell);
                    });
                }
                run() {
                    this.calculatePath(this.map.getStartCell(), this.map.getGoalCell());
                }
                buildPath(s) {
                    while (s !== this.start) {
                        if (!(s.isGoal || s.isStart)) {
                            s.type = index_1.CellType.Current;
                            s.color = undefined;
                        }
                        let parent = this.parent.get(s);
                        this.next.set(parent, s);
                        s = parent;
                    }
                }
                aStar(init) {
                    this.initializeState(init);
                    this.parent.set(init, undefined);
                    init.distance = 0;
                    this.openCells.clear();
                    this.updateF(init);
                    this.openCells.insert(init, init.estimatedDistance);
                    this.closedCells.clear();
                    while (!this.openCells.isEmpty) {
                        let s = this.openCells.pop();
                        if (s.isGoal) {
                            return s;
                        }
                        this.closedCells.insert(s, s.estimatedDistance);
                        let neighbors = this.getNeighbors(s, cell => !cell.isBlocked);
                        for (let neighbor of neighbors) {
                            this.initializeState(neighbor);
                            let neighborsDistance = s.distance + this.distance(neighbor, s);
                            if (neighbor.distance > neighborsDistance) {
                                neighbor.distance = neighborsDistance;
                                this.parent.set(neighbor, s);
                                this.updateF(neighbor);
                                if (this.openCells.has(neighbor)) {
                                    this.openCells.updateKey(neighbor, neighbor.estimatedDistance);
                                }
                                else {
                                    this.openCells.insert(neighbor, neighbor.estimatedDistance);
                                }
                            }
                            if (!(neighbor.isGoal || neighbor.isStart)) {
                                neighbor.cellType = index_1.CellType.Visited;
                            }
                        }
                    }
                    return null;
                }
                h(cell) {
                    return this.distance(cell, this.goal);
                }
                updateF(cell) {
                    cell.estimatedDistance = cell.distance + this.h(cell);
                }
                initializeState(s) {
                    if (this.searches.get(s) !== this.counter) {
                        s.distance = Number.POSITIVE_INFINITY;
                    }
                    else if (s.isGoal) {
                    }
                    this.searches.set(s, this.counter);
                }
                insertState(s, sSuccessor, queue) {
                    let newEstimatedDistance = this.distance(s, sSuccessor) + sSuccessor.estimatedDistance;
                    if (s.estimatedDistance > newEstimatedDistance) {
                        s.estimatedDistance = newEstimatedDistance;
                        if (queue.has(s)) {
                            queue.updateKey(s, s.estimatedDistance);
                        }
                        else {
                            queue.insert(s, s.estimatedDistance);
                        }
                    }
                }
                reestablishConsitency(cell) {
                    let queue = new SimplePriorityQueue_1.SimplePriorityQueue((a, b) => b - a, 0);
                    let neighbors = this.getNeighbors(cell, (x) => (cell.distance + this.distance(x, cell)) < x.distance);
                    neighbors.forEach(x => this.insertState(cell, x, queue));
                    while (!queue.isEmpty) {
                        let lowCell = queue.pop();
                        let lowNeighbors = this.getNeighbors(lowCell, (x) => !x.isBlocked);
                        lowNeighbors.forEach(x => this.insertState(lowCell, x, queue));
                    }
                }
                observe(changedCell) {
                    let distance = Distance_1.Distance.euclid(changedCell, this.currentCell);
                    if (distance < this.visibiltyRange) {
                        if (changedCell.isBlocked) {
                            this.next.delete(changedCell);
                        }
                        else {
                            this.reestablishConsitency(changedCell);
                        }
                    }
                    else {
                        console.info("cell change ignored, cell out of sight", changedCell);
                    }
                }
            };
            exports_1("GAAStar", GAAStar);
        }
    }
});
//# sourceMappingURL=GAAStar.js.map