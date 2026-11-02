import MapStructure from "./MapStructure";
import robotIconSVG from "../icons/robot.svg";
import {Canvas2DContextTrackingWrapper} from "../../utils/Canvas2DContextTrackingWrapper";
import {considerHiDPI} from "../../utils/helpers";

const img = new Image();
img.src = robotIconSVG;

class RobotPositionMapStructure extends MapStructure {
    public static readonly TYPE = "RobotPositionMapStructure";

    // Mota: no se dibuja. El icono es una bola porque el rumbo del firmware no se ha podido verificar
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

        ctx.drawImage(
            this.getOptimizedImage(img, scaledSize.width, scaledSize.height),
            p0.x - scaledSize.width / 2,
            p0.y - scaledSize.height / 2,
            scaledSize.width,
            scaledSize.height
        );
    }
}

export default RobotPositionMapStructure;
