import clsx from 'clsx';
import { CSSProperties, HTMLAttributes, MouseEvent, forwardRef, memo, useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { match } from 'ts-pattern';
import { ChartNode, NodeConnection, NodeId, PortId } from '../model/NodeBase';
import { createNodeInstance, Nodes } from '../model/Nodes';
import { lastRunData } from '../state/dataFlow';
import { NodeBody } from './NodeBody';
import { NodeOutput } from './NodeOutput';
import { ReactComponent as SettingsCogIcon } from 'majesticons/line/settings-cog-line.svg';
import { ReactComponent as SendIcon } from 'majesticons/solid/send.svg';
import { ReactComponent as PinwheelIcon } from 'majesticons/line/pinwheel-line.svg';
import { ReactComponent as GitForkLine } from 'majesticons/line/git-fork-line.svg';
import { ResizeHandle } from './ResizeHandle';
import { canvasPositionState } from '../state/graphBuilder';
import { useCanvasPositioning } from '../hooks/useCanvasPositioning';

export type VisualNodeProps = {
  node: ChartNode;
  connections?: NodeConnection[];
  xDelta?: number;
  yDelta?: number;
  isDragging?: boolean;
  isOverlay?: boolean;
  isSelected?: boolean;
  scale?: number;
  onWireStartDrag?: (event: MouseEvent<HTMLElement>, startNodeId: NodeId, startPortId: PortId) => void;
  onWireEndDrag?: (event: MouseEvent<HTMLElement>, endNodeId: NodeId, endPortId: PortId) => void;
  onSelectNode?: () => void;
  onNodeWidthChanged?: (newWidth: number) => void;

  nodeAttributes?: HTMLAttributes<HTMLDivElement>;
  handleAttributes?: HTMLAttributes<HTMLDivElement>;
};

export const VisualNode = memo(
  forwardRef<HTMLDivElement, VisualNodeProps>(
    (
      {
        node,
        connections = [],
        handleAttributes,
        nodeAttributes,
        xDelta = 0,
        yDelta = 0,
        isDragging,
        isOverlay,
        scale,
        isSelected,
        onWireEndDrag,
        onWireStartDrag,
        onSelectNode,
        onNodeWidthChanged,
      },
      ref,
    ) => {
      const lastRun = useRecoilValue(lastRunData(node.id));

      const style: CSSProperties = {
        opacity: isDragging ? '0' : '',
        transform: `translate(${node.visualData.x + xDelta}px, ${node.visualData.y + yDelta}px) scale(${scale ?? 1})`,
        zIndex: node.visualData.zIndex ?? 0,
        width: node.visualData.width,
      };

      const handlePortMouseDown = useCallback(
        (event: MouseEvent<HTMLDivElement>, port: PortId) => {
          event.stopPropagation();
          event.preventDefault();
          onWireStartDrag?.(event, node.id, port);
        },
        [onWireStartDrag, node.id],
      );

      const handlePortMouseUp = useCallback(
        (event: MouseEvent<HTMLDivElement>, port: PortId) => {
          event.stopPropagation();
          event.preventDefault();
          onWireEndDrag?.(event, node.id, port);
        },
        [onWireEndDrag, node.id],
      );

      const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onSelectNode?.();
        },
        [onSelectNode],
      );

      const handleEditMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
      }, []);

      const [initialWidth, setInitialWidth] = useState<number | undefined>();
      const [initialMouseX, setInitialMouseX] = useState(0);
      const { clientToCanvasPosition } = useCanvasPositioning();

      const getNodeCurrentWidth = (elementOrChild: HTMLElement): number => {
        const nodeElement = elementOrChild.closest('.node');
        if (!nodeElement) {
          return 100;
        }
        const cssWidth = window.getComputedStyle(nodeElement).width;
        return parseInt(cssWidth, 10);
      };

      const handleResizeStart = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        setInitialWidth(getNodeCurrentWidth(event.target as HTMLElement));
        setInitialMouseX(event.clientX);
      };

      const handleResizeMove = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const initialMousePositionCanvas = clientToCanvasPosition(initialMouseX, 0);
        const newMousePositionCanvas = clientToCanvasPosition(event.clientX, 0);

        const delta = newMousePositionCanvas.x - initialMousePositionCanvas.x;

        if (initialWidth) {
          const newWidth = initialWidth + delta;
          onNodeWidthChanged?.(newWidth);
        }
      };

      const nodeImpl = createNodeInstance(node as Nodes);

      return (
        <div
          className={clsx('node', {
            overlayNode: isOverlay,
            selected: isSelected,
            success: lastRun?.status?.type === 'ok',
            error: lastRun?.status?.type === 'error',
            running: lastRun?.status?.type === 'running',
          })}
          ref={ref}
          style={style}
          {...nodeAttributes}
          data-node-id={node.id}
          data-contextmenutype={`node-${node.type}`}
        >
          <div className="node-title">
            <div className="grab-area" {...handleAttributes}>
              {node.isSplitRun ? <GitForkLine /> : <></>}
              <div className="title-text">{node.title}</div>
            </div>
            <div className="title-controls">
              <div className="last-run-status">
                {lastRun?.status ? (
                  match(lastRun.status)
                    .with({ type: 'ok' }, () => (
                      <div className="success">
                        <SendIcon />
                      </div>
                    ))
                    .with({ type: 'error' }, () => (
                      <div className="error">
                        <SendIcon />
                      </div>
                    ))
                    .with({ type: 'running' }, () => (
                      <div className="running">
                        <PinwheelIcon />
                      </div>
                    ))
                    .exhaustive()
                ) : (
                  <></>
                )}
              </div>
              <button className="edit-button" onClick={handleEditClick} onMouseDown={handleEditMouseDown} title="Edit">
                <SettingsCogIcon />
              </button>
            </div>
          </div>
          <NodeBody node={node} />
          <div className="node-ports">
            <div className="input-ports">
              {nodeImpl.getInputDefinitions(connections).map((input) => {
                const connected = connections.some((conn) => conn.inputNodeId === node.id && conn.inputId === input.id);
                return (
                  <div key={input.id} className={clsx('port', { connected })}>
                    <div
                      className="port-circle input-port"
                      onMouseDown={(e) => handlePortMouseDown(e, input.id)}
                      onMouseUp={(e) => handlePortMouseUp(e, input.id)}
                      data-port-id={input.id}
                    />
                    <div className="port-label">{input.title}</div>
                  </div>
                );
              })}
            </div>
            <div className="output-ports">
              {nodeImpl.getOutputDefinitions(connections).map((output) => {
                const connected = connections.some(
                  (conn) => conn.outputNodeId === node.id && conn.outputId === output.id,
                );
                return (
                  <div key={output.id} className={clsx('port', { connected })}>
                    <div
                      className="port-circle output-port"
                      onMouseDown={(e) => handlePortMouseDown(e, output.id)}
                      onMouseUp={(e) => handlePortMouseUp(e, output.id)}
                      data-port-id={output.id}
                    />
                    <div className="port-label">{output.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <NodeOutput node={node} />
          <div className="node-resize">
            <ResizeHandle onResizeStart={handleResizeStart} onResizeMove={handleResizeMove} />
          </div>
        </div>
      );
    },
  ),
);
