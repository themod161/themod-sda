import './HrLine.css'

export default function HrLine({text}) {
    return <div className="hr-line">
        <hr />
        <span className="hr-text">{text}</span>
        <hr />
    </div>
}