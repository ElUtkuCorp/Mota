import MapStructure from "./MapStructure";
import robotIconSVG from "../icons/robot.svg";
import {Canvas2DContextTrackingWrapper} from "../../utils/Canvas2DContextTrackingWrapper";
import {considerHiDPI} from "../../utils/helpers";

const img = new Image();
img.src = robotIconSVG;

class RobotPositionMapStructure extends MapStructure {
    public static readonly TYPE = "RobotPositionMapStructure";

    // Mota: modificable para poder animar el giro (F21). En grados; 0 = el frente del icono hacia arriba
    public angle: number;

    constructor(x0 : number ,y0 : number, angle: number) {
        super(x0, y0);

        this.angle = angle;
    }

    draw(ctxWrapper: Canvas2DContextTrackingWrapper, transformationMatrixToScreenSpace: DOMMatrixInit, scaleFactor: number): void {
        const scaledSize = {
            width: considerHiDPI(img.width) / (considerHiDPI(4.5) / scaleFactor),
            height: considerHiDPI(img.height) / (considerHiDPI(4.5) / scaleFactor)
        };

        if (scaledSize.width < 1 || scaledSize.height < 1) {
            return;
        }

        const ctx = ctxWrapper.getContext();
        const p0 = new DOMPoint(this.x0, this.y0).matrixTransform(transformationMatrixToScreenSpace);

        // Mota: se gira directamente en el contexto en lugar de crear un canvas nuevo en cada dibujo,
        // porque con la animación se dibuja en cada fotograma
        ctxWrapper.save();
        ctxWrapper.translate(p0.x, p0.y);
        ctxWrapper.rotate(this.angle * Math.PI / 180);
        ctx.drawImage(
            this.getOptimizedImage(img, scaledSize.width, scaledSize.height),
            -scaledSize.width / 2,
            -scaledSize.height / 2,
            scaledSize.width,
            scaledSize.height
        );
        ctxWrapper.restore();
    }
}

export default RobotPositionMapStructure;
