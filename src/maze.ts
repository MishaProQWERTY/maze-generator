type Point = { x: number; y: number }

export type MazeResult = {
    matrix: string[]
    width: number
    height: number
    wallSize: number
    entryNodes: { start: Point & { gate: Point }; end: Point & { gate: Point } }
    lastPath?: Point[]
}

const setCharAt = (str: string, index: number, char: string) => str.substring(0, index) + char + str.substring(index + 1)

const getNeighbors = (pos: number, width: number, height: number) => ({
    n: pos - width >= 0 ? pos - width : -1,
    s: pos + width < width * height ? pos + width : -1,
    w: pos > 0 && pos % width !== 0 ? pos - 1 : -1,
    e: (pos + 1) % width !== 0 ? pos + 1 : -1,
})

const getDirection = (a: number, b: number, width: number) => {
    if (b === a - width) return 'n'
    if (b === a + width) return 's'
    if (b === a - 1) return 'w'
    if (b === a + 1) return 'e'
    return null
}

export function generateMaze(opts?: Partial<{ width: number; height: number; wallSize: number; entryType: string }>): MazeResult {
    const { width = 20, height = 20, wallSize = 10, entryType = 'diagonal' } = opts || {}

    const count = width * height
    // node format: [inTreeFlag, north, south, west, east]
    const nodes = Array(count).fill(0).map(() => '01111')

    const positionIndex: Record<string, number> = { n: 1, s: 2, w: 3, e: 4 }
    const oppositeIndex: Record<string, number> = { n: 2, s: 1, w: 4, e: 3 }

    const visited = Array(count).fill(false)
    const first = Math.floor(Math.random() * count)
    visited[first] = true
    nodes[first] = setCharAt(nodes[first], 0, '1')

    const unvisitedCount = () => visited.reduce((a, b) => a + (b ? 0 : 1), 0)

    while (unvisitedCount() > 0) {
        let start
        do {
            start = Math.floor(Math.random() * count)
        } while (visited[start])

        const path: number[] = [start]
        const indexInPath = new Map<number, number>([[start, 0]])
        let current = start

        while (!visited[current]) {
            const neighbors = getNeighbors(current, width, height)
            const validDirs = (Object.keys(neighbors) as Array<keyof typeof neighbors>).filter(d => neighbors[d] !== -1)
            const dir = validDirs[Math.floor(Math.random() * validDirs.length)]
            const next = neighbors[dir]

            if (indexInPath.has(next)) {
                const keepIndex = indexInPath.get(next) as number
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

        for (let i = 0; i < path.length - 1; i++) {
            const a = path[i]
            const b = path[i + 1]
            const dir = getDirection(a, b, width)
            if (!dir) continue

            nodes[a] = setCharAt(nodes[a], positionIndex[dir], '0')
            nodes[b] = setCharAt(nodes[b], oppositeIndex[dir], '0')

            if (!visited[a]) {
                nodes[a] = setCharAt(nodes[a], 0, '1')
                visited[a] = true
            }
            if (!visited[b]) {
                nodes[b] = setCharAt(nodes[b], 0, '1')
                visited[b] = true
            }
        }
    }

    // convert nodes to matrix
    const matrix: string[] = []
    let row1 = ''
    let row2 = ''

    for (let i = 0; i < nodes.length; i++) {
        row1 += row1 === '' ? '1' : ''
        row2 += row2 === '' ? '1' : ''

        if (nodes[i][1] === '1') {
            row1 += '11'
            row2 += nodes[i][4] === '1' ? '01' : '00'
        } else {
            const hasAbove = i - width >= 0
            const above = hasAbove && nodes[i - width][4] === '1'
            const hasNext = (i + 1) % width !== 0
            const next = hasNext && nodes[i + 1][1] === '1'

            if (nodes[i][4] === '1') {
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

        if ((i + 1) % width === 0) {
            matrix.push(row1, row2)
            row1 = ''
            row2 = ''
        }
    }

    matrix.push('1'.repeat((width * 2) + 1))

    const y = (height * 2) + 1 - 2
    const x = (width * 2) + 1 - 2
    const entryNodes = entryType === 'diagonal' ? {
        start: { x: 1, y: 1, gate: { x: 0, y: 1 } },
        end: { x: x, y: y, gate: { x: x + 1, y: y } }
    } : ({ start: { x: 1, y: 1, gate: { x: 0, y: 1 } }, end: { x: x, y: y, gate: { x: x + 1, y: y } } } as any)

    // open entry/exit
    if (matrix[entryNodes.start.gate.y]) {
        matrix[entryNodes.start.gate.y] = setCharAt(matrix[entryNodes.start.gate.y], entryNodes.start.gate.x, '0')
    }
    if (matrix[entryNodes.end.gate.y]) {
        matrix[entryNodes.end.gate.y] = setCharAt(matrix[entryNodes.end.gate.y], entryNodes.end.gate.x, '0')
    }

    return { matrix, width: width * 2 + 1, height: height * 2 + 1, wallSize, entryNodes }
}

export function drawMaze(matrix: string[], wallSize: number, canvas: HTMLCanvasElement) {
    if (!matrix.length) return
    canvas.width = matrix[0].length * wallSize
    canvas.height = matrix.length * wallSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === '1') ctx.fillRect(j * wallSize, i * wallSize, wallSize, wallSize)
        }
    }
}

export function findPath(matrix: string[], entryNodes: MazeResult['entryNodes']): Point[] {
    if (!matrix.length) return []
    const start = entryNodes.start.gate
    const end = entryNodes.end.gate
    const h = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

    const width = matrix[0].length
    const height = matrix.length
    const key = (p: Point) => `${p.x},${p.y}`
    const inBounds = (p: Point) => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height
    const walkable = (p: Point) => inBounds(p) && matrix[p.y][p.x] === '0'

    type Node = { p: Point; g: number; f: number; parent: Node | null }

    const neighbors = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]

    // simple binary heap
    const heap: Node[] = []
    const push = (n: Node) => { heap.push(n); siftUp(heap.length - 1) }
    const pop = (): Node | undefined => { if (!heap.length) return undefined; const r = heap[0]; const end = heap.pop()!; if (heap.length) { heap[0] = end; siftDown(0) } return r }
    const siftUp = (i: number) => { while (i > 0) { const p = Math.floor((i - 1) / 2); if (heap[p].f <= heap[i].f) break;[heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
    const siftDown = (i: number) => { const n = heap.length; while (true) { let l = 2 * i + 1; let r = 2 * i + 2; let smallest = i; if (l < n && heap[l].f < heap[smallest].f) smallest = l; if (r < n && heap[r].f < heap[smallest].f) smallest = r; if (smallest === i) break;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]; i = smallest } }

    const startNode: Node = { p: { x: start.x, y: start.y }, g: 0, f: h(start, end), parent: null }
    push(startNode)
    const openMap = new Map<string, Node>([[key(startNode.p), startNode]])
    const closed = new Set<string>()

    while (heap.length) {
        const current = pop()!
        openMap.delete(key(current.p))
        if (current.p.x === end.x && current.p.y === end.y) {
            const path: Point[] = []
            let cur: Node | null = current
            while (cur) { path.push({ x: cur.p.x, y: cur.p.y }); cur = cur.parent }
            path.reverse()
            return path
        }

        closed.add(key(current.p))

        for (const d of neighbors) {
            const np = { x: current.p.x + d.x, y: current.p.y + d.y }
            const nk = key(np)
            if (!walkable(np) || closed.has(nk)) continue
            const tentativeG = current.g + 1
            const existing = openMap.get(nk)
            if (!existing || tentativeG < existing.g) {
                const neighborNode: Node = { p: np, g: tentativeG, f: tentativeG + h(np, end), parent: current }
                push(neighborNode)
                openMap.set(nk, neighborNode)
            }
        }
    }

    return []
}

export function drawPath(path: Point[], canvas: HTMLCanvasElement, wallSize: number, color = 'red') {
    if (!path.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = color
    for (const p of path) ctx.fillRect(p.x * wallSize, p.y * wallSize, wallSize, wallSize)
}
