import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { generateMaze, drawMaze, findPath, drawPath } from './maze'
import type { MazeResult } from './maze'
import './styles.css'

const Slider = ({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) => {
    return (
        <div className="slider">
            <label>
                <span>{label}: {value}</span>
                <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
            </label>
        </div>
    )
}

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [maze, setMaze] = useState<MazeResult | null>(null)

    const [width, setWidth] = useState(20)
    const [height, setHeight] = useState(20)
    const [wallSize, setWallSize] = useState(8)

    const handleCreate = () => {
        const m = generateMaze({ width, height, wallSize })
        setMaze(m)
        const canvas = canvasRef.current
        if (canvas) {
            drawMaze(m.matrix, m.wallSize, canvas)
        }
    }

    const handleSolve = () => {
        if (!maze) return
        const path = findPath(maze.matrix, maze.entryNodes)
        const canvas = canvasRef.current
        if (canvas) drawPath(path, canvas, maze.wallSize, 'rgba(220,20,60,0.95)')
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const data = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = data
        a.download = `maze-${width}x${height}.png`
        a.click()
    }

    return (
        <div className="app">
            <div className="card">
                <aside className="sidebar">
                    <h1 className="title">Генератор лабиринтов</h1>

                    <div className="controls">
                        <div className="sliders">
                            <Slider label="Ширина (яч.)" min={6} max={60} value={width} onChange={setWidth} />
                            <Slider label="Высота (яч.)" min={6} max={60} value={height} onChange={setHeight} />
                            <Slider label="Размер стены (px)" min={4} max={24} value={wallSize} onChange={setWallSize} />
                        </div>

                        <div className="btns">
                            <button className="btn" onClick={handleCreate}>Создать лабиринт</button>
                            <button className="btn secondary" onClick={handleSolve}>Проложить прохождение</button>
                            <button className="btn" onClick={handleSave}>Сохранить картинку</button>
                        </div>
                    </div>
                </aside>

                <section className="canvas-area">
                    <canvas ref={canvasRef} id="maze" />
                </section>
            </div>
        </div>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
