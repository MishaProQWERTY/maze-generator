type Point = {
    x: number
    y: number
}

export type MazeConfig = {
    width: number
    height: number
    wallSize: number
}

export class MazeGenerator {
    private nodes: string[] = []
    private visited: boolean[] = []
    private width: number
    private height: number

    constructor(private config: MazeConfig) {
        this.width = config.width
        this.height = config.height
    }

    generate(): Maze {
        const count = this.width * this.height
        this.nodes = Array(count).fill('01111')
        this.visited = Array(count).fill(false)

        const first = Math.floor(Math.random() * count)
        this.visited[first] = true
        this.nodes[first] = this.setCharAt(this.nodes[first], 0, '1')

        while (this.unvisitedCount() > 0) {
            this.processRandomPath()
        }

        const matrix = this.convertToMatrix()
        const entryNodes = this.calculateEntryPoints()
        this.openEntryExit(matrix, entryNodes)

        return new Maze(
            matrix,
            this.width * 2 + 1,
            this.height * 2 + 1,
            this.config.wallSize,
            entryNodes
        )
    }

    private processRandomPath(): void {
        const start = this.findUnvisitedStart()
        const path: number[] = [start]
        const indexInPath = new Map<number, number>([[start, 0]])
        let current = start

        while (!this.visited[current]) {
            const neighbors = this.getNeighbors(current)
            const validDirs = (Object.keys(neighbors) as Array<keyof typeof neighbors>)
                .filter(d => neighbors[d] !== -1)
            const dir = validDirs[Math.floor(Math.random() * validDirs.length)]
            const next = neighbors[dir]

            if (indexInPath.has(next)) {
                const keepIndex = indexInPath.get(next)!
                for (let i = path.length - 1; i > keepIndex; i--) {
                    indexInPath.delete(path[i])
                    path.pop()
                }
                current = next
            } else {
                path.push(next)
                indexInPath.set(next, path.length - 1)
                current = next
            }
        }

        this.connectPath(path)
    }

    private connectPath(path: number[]): void {
        const positionIndex: Record<string, number> = { n: 1, s: 2, w: 3, e: 4 }
        const oppositeIndex: Record<string, number> = { n: 2, s: 1, w: 4, e: 3 }

        for (let i = 0; i < path.length - 1; i++) {
            const a = path[i]
            const b = path[i + 1]
            const dir = this.getDirection(a, b)

            if (!dir) continue

            this.nodes[a] = this.setCharAt(this.nodes[a], positionIndex[dir], '0')
            this.nodes[b] = this.setCharAt(this.nodes[b], oppositeIndex[dir], '0')

            if (!this.visited[a]) {
                this.nodes[a] = this.setCharAt(this.nodes[a], 0, '1')
                this.visited[a] = true
            }
            if (!this.visited[b]) {
                this.nodes[b] = this.setCharAt(this.nodes[b], 0, '1')
                this.visited[b] = true
            }
        }
    }

    private convertToMatrix(): string[] {
        const matrix: string[] = []
        let row1 = ''
        let row2 = ''

        for (let i = 0; i < this.nodes.length; i++) {
            row1 += row1 === '' ? '1' : ''
            row2 += row2 === '' ? '1' : ''

            if (this.nodes[i][1] === '1') {
                row1 += '11'
                row2 += this.nodes[i][4] === '1' ? '01' : '00'
            } else {
                const hasAbove = i - this.width >= 0
                const above = hasAbove && this.nodes[i - this.width][4] === '1'
                const hasNext = (i + 1) % this.width !== 0
                const next = hasNext && this.nodes[i + 1][1] === '1'

                if (this.nodes[i][4] === '1') {
                    row1 += '01'
                    row2 += '01'
                } else if (next || above) {
                    row1 += '01'
                    row2 += '00'
                } else {
                    row1 += '00'
                    row2 += '00'
                }
            }

            if ((i + 1) % this.width === 0) {
                matrix.push(row1, row2)
                row1 = ''
                row2 = ''
            }
        }

        matrix.push('1'.repeat((this.width * 2) + 1))
        return matrix
    }

    private calculateEntryPoints() {
        const y = (this.height * 2) + 1 - 2
        const x = (this.width * 2) + 1 - 2
        return {
            start: { x: 1, y: 1, gate: { x: 0, y: 1 } },
            end: { x: x, y: y, gate: { x: x + 1, y: y } }
        }
    }

    private openEntryExit(matrix: string[], entryNodes: Maze['entryNodes']): void {
        if (matrix[entryNodes.start.gate.y]) {
            matrix[entryNodes.start.gate.y] = this.setCharAt(
                matrix[entryNodes.start.gate.y],
                entryNodes.start.gate.x,
                '0'
            )
        }
        if (matrix[entryNodes.end.gate.y]) {
            matrix[entryNodes.end.gate.y] = this.setCharAt(
                matrix[entryNodes.end.gate.y],
                entryNodes.end.gate.x,
                '0'
            )
        }
    }

    private setCharAt(str: string, index: number, char: string): string {
        return str.substring(0, index) + char + str.substring(index + 1)
    }

    private unvisitedCount(): number {
        return this.visited.reduce((count, visited) => count + (visited ? 0 : 1), 0)
    }

    private findUnvisitedStart(): number {
        let start
        do {
            start = Math.floor(Math.random() * this.nodes.length)
        } while (this.visited[start])
        return start
    }

    private getNeighbors(pos: number) {
        return {
            n: pos - this.width >= 0 ? pos - this.width : -1,
            s: pos + this.width < this.width * this.height ? pos + this.width : -1,
            w: pos > 0 && pos % this.width !== 0 ? pos - 1 : -1,
            e: (pos + 1) % this.width !== 0 ? pos + 1 : -1,
        }
    }

    private getDirection(a: number, b: number) {
        if (b === a - this.width) return 'n'
        if (b === a + this.width) return 's'
        if (b === a - 1) return 'w'
        if (b === a + 1) return 'e'
        return null
    }
}

export class Maze {
    constructor(
        public matrix: string[],
        public width: number,
        public height: number,
        public wallSize: number,
        public entryNodes: {
            start: Point & { gate: Point }
            end: Point & { gate: Point }
        }
    ) { }

    draw(canvas: HTMLCanvasElement): void {
        if (!this.matrix.length) return

        canvas.width = this.width * this.wallSize
        canvas.height = this.height * this.wallSize

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000'

        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                if (this.matrix[i][j] === '1') {
                    ctx.fillRect(j * this.wallSize, i * this.wallSize, this.wallSize, this.wallSize)
                }
            }
        }
    }

    findPath(): Point[] {
        return PathFinder.findPath(this.matrix, this.entryNodes)
    }

    drawPath(path: Point[], canvas: HTMLCanvasElement, color = 'red'): void {
        if (!path.length) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = color
        for (const p of path) {
            ctx.fillRect(p.x * this.wallSize, p.y * this.wallSize, this.wallSize, this.wallSize)
        }
    }

    static generate(config: MazeConfig): Maze {
        return new MazeGenerator(config).generate()
    }
}

class PathFinder {
    static findPath(matrix: string[], entryNodes: Maze['entryNodes']): Point[] {
        const start = entryNodes.start.gate
        const end = entryNodes.end.gate
        const width = matrix[0].length
        const height = matrix.length

        const heap: Node[] = []
        const openMap = new Map<string, Node>()
        const closed = new Set<string>()

        const startNode = new Node({ x: start.x, y: start.y }, 0, this.heuristic(start, end), null)
        heap.push(startNode)
        openMap.set(this.key(startNode.p), startNode)

        while (heap.length) {
            const current = this.popMin(heap)!
            openMap.delete(this.key(current.p))

            if (current.p.x === end.x && current.p.y === end.y) {
                return this.reconstructPath(current)
            }

            closed.add(this.key(current.p))

            for (const neighbor of this.getNeighbors(current.p, width, height)) {
                const nk = this.key(neighbor)
                if (!this.isWalkable(neighbor, matrix) || closed.has(nk)) continue

                const tentativeG = current.g + 1
                const existing = openMap.get(nk)

                if (!existing || tentativeG < existing.g) {
                    const neighborNode = new Node(neighbor, tentativeG,
                        tentativeG + this.heuristic(neighbor, end), current)
                    heap.push(neighborNode)
                    openMap.set(nk, neighborNode)
                }
            }
        }

        return []
    }

    private static heuristic(a: Point, b: Point): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    }

    private static key(p: Point): string {
        return `${p.x},${p.y}`
    }

    private static isWalkable(p: Point, matrix: string[]): boolean {
        return p.x >= 0 && p.x < matrix[0].length &&
            p.y >= 0 && p.y < matrix.length &&
            matrix[p.y][p.x] === '0'
    }

    private static getNeighbors(p: Point, width: number, height: number): Point[] {
        const neighbors: Point[] = []
        if (p.x > 0) neighbors.push({ x: p.x - 1, y: p.y })
        if (p.x < width - 1) neighbors.push({ x: p.x + 1, y: p.y })
        if (p.y > 0) neighbors.push({ x: p.x, y: p.y - 1 })
        if (p.y < height - 1) neighbors.push({ x: p.x, y: p.y + 1 })
        return neighbors
    }

    private static popMin(heap: Node[]): Node | undefined {
        if (!heap.length) return undefined

        let minIdx = 0
        for (let i = 1; i < heap.length; i++) {
            if (heap[i].f < heap[minIdx].f) minIdx = i
        }

        const min = heap[minIdx]
        heap[minIdx] = heap[heap.length - 1]
        heap.pop()

        return min
    }

    private static reconstructPath(endNode: Node): Point[] {
        const path: Point[] = []
        let current: Node | null = endNode

        while (current) {
            path.push({ x: current.p.x, y: current.p.y })
            current = current.parent
        }

        return path.reverse()
    }
}

class Node {
    constructor(
        public p: Point,
        public g: number,
        public f: number,
        public parent: Node | null
    ) { }
}
