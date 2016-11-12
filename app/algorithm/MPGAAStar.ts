/*
 * MPGAA* = Multipath Generalized Adaptive A*
 * Paper "Reusing Previously Found A* Paths for Fast Goal-Directed Navigation in Dynamic Terrain" HernandezAB15
*/

import { Cell, Map, CellType, Position, Moveable } from "../grid/index";
import { PathAlgorithm } from "./PathAlgorithm";
import * as PriorityQueue from "js-priority-queue";
import { Distance } from "./Distance";
import { TypMappedDictionary } from "./../tools/index";
import { SimplePriorityQueue } from './../tools/SimplePriorityQueue';

export class MPGAAStar extends PathAlgorithm {
    private goal: Cell;
    private start: Cell;
    private openCells: SimplePriorityQueue<Cell, number>;
    private closedCells: SimplePriorityQueue<Cell, number>;
    /** Iteration counter. Incremented before every A* search. */
    private counter: number;

    /** Current postion of the robot */
    private currentCell: Cell;

    /**
     * searches (number) returns the number of the last search in which s (the cell) was generated.
     * If it is equal to 0 if s has never been generated.
     */
    private searches: TypMappedDictionary<Cell, number>;

    /**
     * Contains the pointer for each state s along the path found by A*
     */
    private next: TypMappedDictionary<Cell, Cell>;    
    private parent: TypMappedDictionary<Cell, Cell>;
    /** keep track of those states which support the h-values of other states */
    private support: TypMappedDictionary<Cell, Cell>;
    private robot: Moveable;

    constructor(public map: Map, private visibiltyRange: number) {
        super();

        this.closedCells = new SimplePriorityQueue<Cell, number>((a, b) => a - b, 0);
        this.openCells = new SimplePriorityQueue<Cell, number>((a, b) =>  a - b, 0);
        this.goal = this.map.getGoalCell();
        this.start = this.map.getStartCell();
        this.currentCell = this.start;
        this.searches = new TypMappedDictionary<Cell, number>(cell => this.map.getIndexOfCell(cell), 0);
        this.next = new TypMappedDictionary<Cell, Cell>(cell => this.map.getIndexOfCell(cell));
        this.parent = new TypMappedDictionary<Cell, Cell>(cell => this.map.getIndexOfCell(cell));
        this.support = new TypMappedDictionary<Cell, Cell>(cell => this.map.getIndexOfCell(cell));

        this.robot = new Moveable(map, CellType.Current);
    }
 
    /**
     * Entry point.
     * Equals to "main()" Line 56 within the pseudo code
     * 
     * Returns the next cell on the path.
     */
    public calulatePath(start: Cell, goal: Cell) {
        this.init();

        this.start = start;
        this.goal = goal;

        this.counter++;
        let s = this.aStar(this.start);

        if (s === null) {
            // todo: check if its handy to throw an error here.
            throw new Error("goal is not reachable");
        }

        /* todo: Pseudo code says:
            for each s' ∈ Closed do
                h(s' ) ← g(s) + h(s) − g(s' ) // heuristic update
            todo: Check if s' ∈ Closed means neighbors of s that are on the closed list
        */
        let cells = this.getNeighbors(s, (x: Cell) => this.closedCells.has(x));

        cells.forEach(cell => {
            // heuristic update             
            cell.heuristicDistance = s.distance + s.heuristicDistance - cell.distance;
        });

        this.buildPath(s);
        return this.next.get(this.start);
    }


    private initialized = false;
    private init() {
        if (this.initialized)
            return;

        this.initialized = true;
        this.counter = 0;
        //this.observe(this.start);

        this.map.cells.forEach(cell => {
            this.searches.set(cell, 0);
            cell.heuristicDistance = this.H(cell);
            this.next.delete(cell); // todo: check if we really need this line
        });
    }
    
    public run() {
        /** This equals to a basic A* search */
        this.calulatePath(this.map.getStartCell(),this.map.getGoalCell());        
    }

    private buildPath(s: Cell): void {
        while (s !== this.start) {
            if (!(s.isGoal || s.isStart)) {
                s.type = CellType.Current;
                s.color = undefined;
            }
            let parent = this.parent.get(s);
            this.next.set(parent, s);
            s = parent;
        }
    }

    private aStar(init: Cell): Cell {
        // todo: add code
        // cell.distance = g(x)
        // cell.estimatedDistance = f(x)
        // h(x) = this.distance(x,this.goal)
        // f Pfad vom Start zum Ziel f(x)=g(x)+h(x)
        // g(x) die bisherigen Kosten vom Startknoten
        // h(x) die geschätzten Kosten von x bis zum Zielknoten

        this.initializeState(init);
        this.parent.set(init, undefined);

        init.distance = 0;

        this.openCells.clear();

        this.updateF(init);

        this.openCells.insert(init, init.estimatedDistance);

        this.closedCells.clear();

        while (!this.openCells.isEmpty) {
            let s = this.openCells.pop();
            if (this.GoalCondition(s)){
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
                        // neighbor.distance + neighbor.heuristicDistance == neighbor.estimatedDistance
                        this.openCells.updateKey(neighbor, neighbor.distance + neighbor.heuristicDistance); 
                    }
                    else {
                        // neighbor.distance + neighbor.heuristicDistance == neighbor.estimatedDistance
                        this.openCells.insert(neighbor, neighbor.distance + neighbor.heuristicDistance);
                    }
                }
                if (!(neighbor.isGoal || neighbor.isStart)) {
                    neighbor.cellType = CellType.Visited;
                }
            }
        }
        return null;
    }

    /** returns the heuristic distance value from the cell to the goal. */
    private H(cell: Cell) {
        return this.distance(cell, this.goal);
    }

    /** Updates the estimated distance value for a given cell*/
    private updateF(cell: Cell) {
        cell.estimatedDistance = cell.distance + cell.heuristicDistance;
    }

    private GoalCondition(s:Cell){
        let steps = 0;

        if(this.next.get(s) !== undefined)
        {
            let hs = s.heuristicDistance;
            let hnext = this.next.get(s).heuristicDistance;
            let cnext = this.distance(s,this.next.get(s));

            let diff = hs - (hnext + cnext);
            console.log(`${diff} = ${hs} - (${hnext} + ${cnext})`,s,this.next.get(s));            
        }                 

        while (this.next.get(s) !== undefined && s.heuristicDistance === this.next.get(s).heuristicDistance + this.distance(s,this.next.get(s)))
        {                        
            s = this.next.get(s);
            steps++ ;            
        } 

      /*  while (this.next.get(s) !== undefined)
        {                        
             let diff = this.h(s) - (this.h(this.next.get(s)) + this.distance(s,this.next.get(s)));
             if(Math.round(diff) !== 0)
                break;             

            s = this.next.get(s);
            steps++ ;            
        }*/

        if(steps > 1 && s.isGoal)
            console.log("Resused " + steps + " cells long path");
        return s.isGoal;
    }

    private initializeState(s: Cell) {
        if (this.searches.get(s) !== this.counter) {
            s.distance = Number.POSITIVE_INFINITY;
        }
        else if (s.isGoal) {            
            //   console.error(s,this.searches.get(s), this.counter);
        }
        this.searches.set(s, this.counter);
    }

    private insertState(s: Cell, sSuccessor: Cell, queue: SimplePriorityQueue<Cell, number>) {
        let newDistance = this.distance(s, sSuccessor) + sSuccessor.heuristicDistance; // todo: This should be sSuccessor.distance???
        if (s.heuristicDistance > newDistance) {
            s.heuristicDistance = newDistance;

            this.next.delete(s);
            this.support.set(s,sSuccessor);

            if (queue.has(s)) {
                queue.updateKey(s, s.heuristicDistance);
            } else {
                queue.insert(s, s.heuristicDistance);
            }
        }
    }

    private reestablishConsitency(cell: Cell) {
        /*
            For the sake of simplicty we call this method everytime we found a
            new cell with decreased edege (read arc) costs. 
            To improve the performace one should mark all these cells and process 
            them in one run.
        */

        let queue = new SimplePriorityQueue<Cell, number>((a, b) => b - a, 0);

        // for each (s, s') such that c(s, s') decreased do
        let neighbors = this.getNeighbors(cell,
            (x: Cell) => (cell.distance + this.distance(x, cell)) < x.distance);
        // InsertState (s, s' , Q)
        neighbors.forEach(x => this.insertState(cell, x, queue));

        while (!queue.isEmpty) {
            // Extract state s' with lowest h-value in Q
            let lowCell = queue.pop();

            if (this.next.get(this.support.get(lowCell)) !== undefined){
                this.next.set(lowCell,this.support.get(lowCell));
            }

            let lowNeighbors = this.getNeighbors(lowCell, (x: Cell) => !x.isBlocked);
            lowNeighbors.forEach(x => this.insertState(lowCell, x, queue));
        }
    }

    /**
     * Observes map changes
     * Line 33 in pseudo code
     */
    private observe(changedCell: Cell) {        
            /*  Todo: Review
                Pseudo Code Line 34 to 38

                We remove all cells with increased edge costs from the current path.
                In our case, we remove blocked cells from the path.
            */
            let distance = Distance.euklid(changedCell, this.currentCell);
            if (distance < this.visibiltyRange) { // arcs in the range of visibility from s
                if (changedCell.isBlocked) {
                    this.next.delete(changedCell);
                } else {
                    /*
                        Todo: Fix this. 
                        ReestablishConsitency should only be called, if the cell was blocked befor. 
                        Sice the map does not provide the old value yet, we can't tell if the state has changed.
                        However, until this is fixed we invoke it everytime. This should not hurt, but reduce the performance. 
                    */
                    this.reestablishConsitency(changedCell);
                }
            }else{
                console.info("cell change ignored, cell out of sight",changedCell);
            }        
    }
}
