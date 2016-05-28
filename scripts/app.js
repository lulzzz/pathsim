var app = angular.module('pathsim', []);

/* Change map from regular js
angular.element($0).scope().$apply((scope) => {scope.map.map[0][0].isBlocked = scope.map.map[0][0].isBlocked!})
angular.element($0).scope().$apply((scope) => {console.log(scope)})
*/

app.controller('MapController', function ($attrs, $interval) {
    var map = this;
    map.name = "test";
    map.cols = $attrs.cols;
    map.rows = $attrs.rows;
    map.robots = undefined;
    map.algorithm = "AStar";
    map.algorithmInstance = {};
    map.distance = "euklid";
    map.isVisualizePathEnabled = true;
    map.stat = {};

    map.initializeMap = (predefinedMap) => {
        if(predefinedMap === undefined)
        {
          map.map = new Map(map.rows, map.cols);

          var start = new Moveable(map.map, CellType.Start);
          start.moveTo(new Position(0, 0));

          var goal = new Moveable(map.map, CellType.Goal);
          goal.moveTo(new Position(map.cols -1 , map.rows-1));

        }
        else {
          map.map = predefinedMap;
        }

        map.cellSize = 25;
        map.widthPx = map.map.cols * map.cellSize;
        map.heightPx = map.map.rows * map.cellSize;

        map.map.notifyOnChange(cell =>
        {
          if(map.algorithmInstance.isInitialized){
            console.time(map.algorithm);
            map.algorithmInstance.mapUpdate([cell]);
            console.timeEnd(map.algorithm);
          }
        });
    };
    map.initializeMap();




    map.cleanMap = () => {
        map.map.resetPath();
        map.map.resetBlocks();
        map.clearRobots();
    };
    map.runStepByStep = () => {
        map.map.resetPath();
        map.clearRobots();
        let pathFinder = map.getAlgorithmInstance();

        var intervall = $interval(() => {
            if (!pathFinder.step()) {
                $interval.cancel(intervall);
            }
            else {
              map.visualizePathCosts();
            }
            map.calulateStatistic();
        }, 10);
    };

    map.visualizePathCosts = () => {
        if (map.isVisualizePathEnabled === true) {
            let visual = new PathCostVisualizer(map.map);
            visual.paint();
        }
    };

    map.addRandomObstacles = () => {
        map.map.resetPath();
        let generator = new ObstacleGenerator(map.map);
        generator.addRandomObstacles((map.map.cols * map.map.rows) * 0.1);
        map.calulatePath();
    };

    map.addDynamicObstacle = () => {
        if (map.robots === undefined) {
            map.robots = new DynmicObstacleGenerator(map.map);
        }
        map.robots.add();

        if (map.robotIntervall !== undefined) {
            $interval.cancel(map.robotIntervall);
        }

        map.robotIntervall = $interval(() => {
            map.map.resetPath();
            map.robots.update();
            map.calulatePath();
        }, 800);


    };

    map.clearRobots = () => {
        $interval.cancel(map.robotIntervall);
        if(map.robots !== undefined)
          map.robots.robots.forEach(robot => map.map.getCell(robot.position.x,robot.position.y).cellType = 0);
        map.robots = undefined;
    };

    map.calulatePath = () => {

        let pathFinder = map.getAlgorithmInstance();
        if(pathFinder.isInitialized === undefined || pathFinder.isInitialized === false)
        {
          console.time(map.algorithm);
          //console.profile("Dijkstra");
          pathFinder.run();
          //console.profileEnd("Dijkstra");
          console.timeEnd(map.algorithm);
        }


        map.visualizePathCosts();
        map.calulateStatistic();
    };

    map.calulateStatistic = () => {
      map.stat.pathLength = map.map.cells.filter(x => x.isCurrent).length;
      map.stat.visitedCells = map.stat.pathLength + map.map.cells.filter(x => x.isVisited).length;
    };

    map.clickOnCell = (cell) => {
        map.map.resetPath();
        switch (cell.type) {
        case CellType.Blocked:
            cell.type = CellType.Free;
            break;
        case CellType.Free:
            cell.type = CellType.Blocked;
            break;
        default:
        }
        this.map.updateCell(cell);
        map.calulatePath();
    };

    map.mouseOverCell = (cell, event) => {
        if (event.buttons == 1) {
            this.clickOnCell(cell);
        }

        map.stat.cell = cell.toString();
        map.hoveredCell = cell;
    };

    map.getAlgorithmInstance = () => {
      let algorithm;
        switch (map.algorithm) {
          case 'Dijkstra':
              algorithm = new Dijkstra(map.map);
              break;
          case 'LpaStar':
                if(map.algorithmInstance instanceof LpaStar)
                {
                  algorithm = map.algorithmInstance;
                }
                else {
                  algorithm = new LpaStar(map.map);
                }

                break;
          default:
            algorithm = new AStar(map.map);
        }

        switch (map.distance) {
          case "manhattan":
             algorithm.distance = Distance.manhattan;
            break;
            case "diagonalShortcut":
               algorithm.distance = Distance.diagonalShortcut;
              break;
          default:
            algorithm.distance = Distance.euklid;
        }

      map.algorithmInstance = algorithm;
      return algorithm;
    };

});
