//Clase para las células
class Cell {
    constructor (isAlive = false) {
        this.isAlive = isAlive;
        this.aliveTime = isAlive ? 1 : 0; // Contador de tiempo que está viva
    }
    //Actualizamos el estado de la célula
    calcularEstado (aliveNeighbors) {
        let newState = this.isAlive;

        if (this.isAlive) {
            if (aliveNeighbors < 2 || aliveNeighbors > 3) { //sobrevive con 2 o 3 vecinas
                newState = false; 
            }
        } else {
            if (aliveNeighbors === 3) { //nace con 3 vecinas
                newState = true; 
            }
        }
        return newState;
    }
    //Aplicamos el nuevo estado
    aplicarEstado (newState) {
        if (newState) {
            this.isAlive = true;
            this.aliveTime += 1; // Incrementamos el tiempo viva
        } else {
            this.isAlive = false;
            this.aliveTime = 0; //Si muere, se reinicia, si sigue muerta se queda en 0
        }
    }
    //Método para alternar el estado de la célula
    toggle () {
        this.isAlive = !this.isAlive;
        this.aliveTime = this.isAlive ? 1 : 0;
    }
}

//Clase mundo
//Constantes para el mundo
const N = 40; //Ancho/alto del mundo
const CELL_SIZE = 15; //Tamaño del lado de la celda en pixeles

class World {
    constructor(size){
        this.size = size;
        this.cells = this.crearGridVacío();
        this.stepCount = 0; 
        this.isSimulating = false; // <- antes tenías "simulando"
        this.timerId = null; // ID del temporizador
        this.lastHoveredCell = null; // Para mejorar la info al pasar el ratón

        //Inicializamos el canvas
        const canvas = document.getElementById('game-canvas');
        this.ctx = canvas.getContext('2d'); 
        canvas.width = size * CELL_SIZE;
        canvas.height = size * CELL_SIZE;

        //Manejadores de eventos
        canvas.addEventListener('click', this.handleMouseClick.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        //Dibujar
        this.draw();
    }

    //Crear una cuadrícula vacía
    crearGridVacío() {
        const grid = [];
        for (let i = 0; i < this.size; i++) {
            grid[i] = [];
            for (let j = 0; j < this.size; j++) {
                grid[i][j] = new Cell(false);
            }
        }
        return grid;
    }

    //Calcula la posición para conectar el mundo (los bordes)
    wrap(coord){
        return (coord + this.size) % this.size;
    }

    //Contamos las vecinas vivas
    getAliveNeighbors(fila, columna){
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue; // Saltamos la célula actual
                const neighborRow = this.wrap(fila + i);
                const neighborCol = this.wrap(columna + j);
                if (this.cells[neighborRow][neighborCol].isAlive) {
                    count++;
                }
            }
        }
        return count;
    }

    //Avanzamos un turno
    advance(){
        //Calculamos los proximos estados
        const newStates = [];
        for (let i = 0; i < this.size; i++) {
            newStates[i] = [];
            for (let j = 0; j < this.size; j++) {
                const aliveNeighbors = this.getAliveNeighbors(i, j);
                newStates[i][j] = this.cells[i][j].calcularEstado(aliveNeighbors);
            }
        }
        //Aplicamos los nuevos estados
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                this.cells[i][j].aplicarEstado(newStates[i][j]);
            }
        }
        this.stepCount++;
        this.updateInfoDisplay();
        this.draw(); //Redibujamos
    }

    //Métodos de interfaz y control de simulación
    draw(){
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); //Borramos el canvas antes de dibujar
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const cell = this.cells[i][j];
                const x = j * CELL_SIZE;
                const y = i * CELL_SIZE;

                if (cell.isAlive) {
                    this.ctx.fillStyle = 'black'; // Célula viva
                    this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                } else {
                    //Dibujamos el borde de la rejilla
                    this.ctx.strokeStyle = '#eee';
                    this.ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    //Actualizamos la información de la simulación
    updateInfoDisplay(){
        document.getElementById('step-info').textContent = `Simulación en marcha: Paso ${this.stepCount}`;
    }

    // Vaciar todas las células (muertas)
    clearCells() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                this.cells[i][j].isAlive = false;
                this.cells[i][j].aliveTime = 0;
            }
        }
        this.stepCount = 0;
        this.updateInfoDisplay();
        this.draw();
    }

    // Aplicar un patrón centrado en el mundo
    applyPattern(patternName) {
        // Patrones definidos como coordenadas relativas (fila, columna)
        const patterns = {
            // Parpadeador (blinker)
            blinker: [
                [0, -1],
                [0, 0],
                [0, 1]
            ],
            // Barco 
            boat: [
                [0, 1],
                [0, 2],
                [1, 0],
                [1, 2],
                [2, 1]
            ],
            // Planeador (glider)
            glider: [
                [0, 1],
                [1, 2],
                [2, 0],
                [2, 1],
                [2, 2]
            ],
            // Faro (beacon), este es nuevo nuestro jeje
             beacon: [
                [0, 0], [0, 1],
                [1, 0], [1, 1],
                [2, 2], [2, 3],
                [3, 2], [3, 3]
            ]   
        };

        const relativeCoords = patterns[patternName];
        if (!relativeCoords) return;

        // Primero vaciamos el mundo
        this.clearCells();

        const centerRow = Math.floor(this.size / 2);
        const centerCol = Math.floor(this.size / 2);

        for (const [dr, dc] of relativeCoords) {
            const row = this.wrap(centerRow + dr);
            const col = this.wrap(centerCol + dc);
            const cell = this.cells[row][col];
            cell.isAlive = true;
            cell.aliveTime = 1;
        }

        this.stepCount = 0;
        this.updateInfoDisplay();
        this.draw();
    }

    //Manejamos el ratón
    handleMouseClick(event) {
        if (this.isSimulating) return;

        // 1. Obtener la posición y límites del canvas.
        const rect = this.ctx.canvas.getBoundingClientRect();
        
        // 2. Calcular la posición (x, y) relativa al canvas.
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // 3. Calcular los índices de la matriz (fila, columna).
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            this.cells[row][col].toggle();
            this.draw(); // Redibujar solo si hubo un cambio
        }
    }

    //Al pasar el ratón, muestra info de la célula
    handleMouseMove(event) {
        const infoElement = document.getElementById('cell-info');
        const rect = this.ctx.canvas.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        if (this.lastHoveredCell && this.lastHoveredCell.row === row && this.lastHoveredCell.col === col) {
            return; 
        }
        
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            const cell = this.cells[row][col];
            
            let timeInfo;
            if (cell.isAlive) {
                timeInfo = `lleva viva ${cell.aliveTime} pasos.`;
            } else {
                timeInfo = `está muerta (simulación va por el paso ${this.stepCount}).`; 
            }

            infoElement.textContent = `La célula (${col}, ${row}) ${timeInfo}`;
            
            // Almacenar la celda actual para la próxima comprobación
            this.lastHoveredCell = { row: row, col: col };
        } else {
            infoElement.textContent = 'Pasa el ratón sobre una célula para ver información.';
            this.lastHoveredCell = null; // Reiniciar
        }
    }

    //Iniciamos la simulación
    play(){
        if (this.isSimulating) return;

        this.isSimulating = true;
        
        // Avance: N pasos por segundo
        const intervalTime = 1000 / N; // milisegundos
        
        // setInterval ejecuta la función cada 'intervalTime' ms.
        this.timerId = setInterval(() => this.advance(), intervalTime);

        // Control de botones
        document.getElementById('play-button').disabled = true;
        document.getElementById('stop-button').disabled = false;
    }

    //Detenemos
    stop(){
        if (!this.isSimulating) return;

        this.isSimulating = false;
        
        // Detiene el temporizador asociado. 
        clearInterval(this.timerId); 
        this.timerId = null;

        // Control de botones
        document.getElementById('play-button').disabled = false;
        document.getElementById('stop-button').disabled = true;
    }
}

//Inicializamos los eventos y el mundo 
document.addEventListener('DOMContentLoaded', () => {
    //Instanciamos el mundo
    const world = new World(N);

    //Conectamos eventos a botones de simulación
    document.getElementById('play-button').addEventListener('click', () => world.play());
    document.getElementById('stop-button').addEventListener('click', () => world.stop());

    // Botones de patrones
    document.getElementById('pattern-blinker').addEventListener('click', () => {
        world.stop();
        world.applyPattern('blinker');
    });

    document.getElementById('pattern-boat').addEventListener('click', () => {
        world.stop();
        world.applyPattern('boat');
    });

    document.getElementById('pattern-glider').addEventListener('click', () => {
        world.stop();
        world.applyPattern('glider');
    });
    document.getElementById('pattern-beacon').addEventListener('click', () => {
        world.stop();
        world.applyPattern('beacon');
    });
});
