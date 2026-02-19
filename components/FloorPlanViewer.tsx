import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Group, Text, Rect } from 'react-konva';
import Konva from 'konva';
import {
  Upload, ZoomIn, ZoomOut, RotateCcw, Move, Pencil, MousePointer, Scissors, Trash2, Link, Unlink,
  X, Printer, Layers, Eye, EyeOff, FileImage, Square, Triangle, RotateCw, Combine, Edit3, Wand2, Loader2, Settings2,
  Undo2, Redo2
} from 'lucide-react';

// OpenCV.js 타입 선언
declare global {
  interface Window {
    cv: any;
    cvReady: boolean;
  }
}
import { FloorPlan, FloorZone, ZonePoint, ZoneType, Unit, LeaseContract, Stakeholder, Building } from '../types';

interface FloorPlanViewerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  building: Building;
  floorNumber: number;
  floorArea: number;
  units: Unit[];
  leaseContracts: LeaseContract[];
  stakeholders: Stakeholder[];
  floorPlans: FloorPlan[];
  floorZones: FloorZone[];
  onSaveFloorPlan: (plan: FloorPlan) => void;
  onDeleteFloorPlan: (planId: string) => void;
  onSaveZone: (zone: FloorZone) => void;
  onDeleteZone: (zoneId: string) => void;
  allFloorPlans: FloorPlan[];
}

const ZONE_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9c27b0',
  '#00bcd4', '#ff5722', '#607d8b', '#e91e63', '#3f51b5'
];

type ToolType = 'SELECT' | 'DRAW_POLYGON' | 'DRAW_RECT' | 'DRAW_TRIANGLE' | 'EDIT_POINTS' | 'PAN' | 'ROTATE';

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({
  isOpen, onClose, propertyId, propertyName, building, floorNumber, floorArea,
  units, leaseContracts, stakeholders,
  floorPlans, floorZones, onSaveFloorPlan, onDeleteFloorPlan, onSaveZone, onDeleteZone,
  allFloorPlans
}) => {
  const currentPlan = floorPlans.find(p =>
    p.propertyId === propertyId && p.buildingId === building.id && p.floorNumber === floorNumber
  );

  // 상태
  const [activeTool, setActiveTool] = useState<ToolType>('SELECT');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  // 드로잉 상태
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<ZonePoint[]>([]);
  const [drawingStart, setDrawingStart] = useState<ZonePoint | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]); // 다중 선택 (병합용)

  // 조닝 설정
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  const [newZoneOpacity, setNewZoneOpacity] = useState(0.4);

  // 회전 상태
  const [rotationAngle, setRotationAngle] = useState(0);

  // 모달
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTargetZoneId, setLinkTargetZoneId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSelectExistingModal, setShowSelectExistingModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingZoneName, setEditingZoneName] = useState('');

  // 레이어 가시성
  const [showZones, setShowZones] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hiddenZoneIds, setHiddenZoneIds] = useState<Set<string>>(new Set());

  // OpenCV 자동 감지 상태
  const [isDetecting, setIsDetecting] = useState(false);
  const [showDetectSettings, setShowDetectSettings] = useState(false);
  const [detectSettings, setDetectSettings] = useState({
    threshold: 127,        // 이진화 임계값 (0-255)
    minArea: 0.005,        // 최소 영역 비율 (전체 대비) - 더 작은 영역도 감지
    simplify: 0.001,       // 윤곽선 단순화 정도 - 더 정밀하게
    invertColors: false,   // 색상 반전 (검은 배경용)
    detectAll: true,       // 모든 윤곽선 감지 (기본 true)
    detectMode: 'canny' as 'threshold' | 'canny' | 'adaptive',  // 감지 모드
    cannyLow: 50,          // Canny 엣지 감지 하한
    cannyHigh: 150,        // Canny 엣지 감지 상한
    detectInternal: true   // 내부 공간도 감지
  });
  const [detectedContours, setDetectedContours] = useState<ZonePoint[][]>([]);

  // 실행취소/다시실행 히스토리
  const [zoneHistory, setZoneHistory] = useState<FloorZone[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false); // undo/redo 중인지 추적
  const maxHistoryLength = 50;

  // 히스토리에 현재 상태 저장 (undo/redo 중이 아닐 때만)
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const currentState = floorZones.filter(z => z.floorPlanId === currentPlan?.id);
    setZoneHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(currentState)));
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistoryLength - 1));
  }, [floorZones, currentPlan?.id, historyIndex]);

  // 조닝 저장 래퍼 (히스토리 자동 저장)
  const saveZoneWithHistory = useCallback((zone: FloorZone) => {
    if (!isUndoRedoRef.current) {
      saveToHistory();
    }
    onSaveZone(zone);
  }, [onSaveZone, saveToHistory]);

  // 조닝 삭제 래퍼 (히스토리 자동 저장)
  const deleteZoneWithHistory = useCallback((zoneId: string) => {
    if (!isUndoRedoRef.current) {
      saveToHistory();
    }
    onDeleteZone(zoneId);
  }, [onDeleteZone, saveToHistory]);

  // 실행취소
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoRedoRef.current = true;
    const prevIndex = historyIndex - 1;
    const prevState = zoneHistory[prevIndex];
    if (!prevState) { isUndoRedoRef.current = false; return; }

    // 현재 도면의 모든 조닝 삭제
    currentZones.forEach(z => onDeleteZone(z.id));
    // 이전 상태 복원
    prevState.forEach(z => onSaveZone({ ...z }));
    setHistoryIndex(prevIndex);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [historyIndex, zoneHistory, currentZones, onDeleteZone, onSaveZone]);

  // 다시실행
  const handleRedo = useCallback(() => {
    if (historyIndex >= zoneHistory.length - 1) return;
    isUndoRedoRef.current = true;
    const nextIndex = historyIndex + 1;
    const nextState = zoneHistory[nextIndex];
    if (!nextState) { isUndoRedoRef.current = false; return; }

    // 현재 도면의 모든 조닝 삭제
    currentZones.forEach(z => onDeleteZone(z.id));
    // 다음 상태 복원
    nextState.forEach(z => onSaveZone({ ...z }));
    setHistoryIndex(nextIndex);
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [historyIndex, zoneHistory, currentZones, onDeleteZone, onSaveZone]);

  // 키보드 단축키 (Ctrl+Z: 실행취소, Ctrl+Y/Ctrl+Shift+Z: 다시실행)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // 도면 변경 시 히스토리 초기화
  useEffect(() => {
    if (currentPlan) {
      const initialState = floorZones.filter(z => z.floorPlanId === currentPlan.id);
      setZoneHistory([JSON.parse(JSON.stringify(initialState))]);
      setHistoryIndex(0);
    }
  }, [currentPlan?.id]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // 현재 층의 조닝 목록
  const currentZones = floorZones.filter(z => z.floorPlanId === currentPlan?.id);
  const visibleZones = currentZones.filter(z => !hiddenZoneIds.has(z.id));
  const floorBoundary = currentZones.find(z => z.type === 'FLOOR_BOUNDARY');

  const getFloorLabel = (n: number) => n > 0 ? `${n}F` : `B${Math.abs(n)}`;

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current || !isOpen) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // 이미지 로드
  useEffect(() => {
    if (!currentPlan) { setImage(null); return; }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = currentPlan.fileData;
  }, [currentPlan]);

  // 이미지/컨테이너 크기 변경 시 캔버스에 맞추기 (최초 1회)
  const [initialFitDone, setInitialFitDone] = useState(false);
  useEffect(() => {
    if (image && containerSize.width > 0 && containerSize.height > 0 && !initialFitDone) {
      const padding = 40;
      const availableWidth = containerSize.width - padding * 2;
      const availableHeight = containerSize.height - padding * 2;
      const scaleX = availableWidth / image.width;
      const scaleY = availableHeight / image.height;
      const fitZoom = Math.min(scaleX, scaleY, 1);
      const offsetX = (containerSize.width - image.width * fitZoom) / 2;
      const offsetY = (containerSize.height - image.height * fitZoom) / 2;
      setZoom(fitZoom);
      setPanOffset({ x: offsetX, y: offsetY });
      setInitialFitDone(true);
    }
  }, [image, containerSize, initialFitDone]);

  // currentPlan 변경 시 초기화 플래그 리셋
  useEffect(() => {
    setInitialFitDone(false);
  }, [currentPlan?.id]);

  // 좌표 변환
  const toCanvasCoords = useCallback((p: ZonePoint) => {
    if (!image) return { x: 0, y: 0 };
    return {
      x: p.x * image.width * zoom + panOffset.x,
      y: p.y * image.height * zoom + panOffset.y
    };
  }, [image, zoom, panOffset]);

  const toNormalizedCoords = useCallback((canvasX: number, canvasY: number): ZonePoint => {
    if (!image) return { x: 0, y: 0 };
    return {
      x: (canvasX - panOffset.x) / (image.width * zoom),
      y: (canvasY - panOffset.y) / (image.height * zoom)
    };
  }, [image, zoom, panOffset]);

  // 다각형 면적 계산 (Shoelace formula)
  const calculatePolygonArea = (points: ZonePoint[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  const estimateRealArea = (normalizedArea: number): number => {
    if (!floorBoundary) return 0;
    const boundaryNormalizedArea = calculatePolygonArea(floorBoundary.points);
    if (boundaryNormalizedArea === 0) return 0;
    return (normalizedArea / boundaryNormalizedArea) * floorArea;
  };

  // 줌/팬
  const handleZoom = (delta: number) => setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));
    const mousePointTo = {
      x: (pointer.x - panOffset.x) / oldScale,
      y: (pointer.y - panOffset.y) / oldScale
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    };
    setZoom(clampedScale);
    setPanOffset(newPos);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'PAN' || e.evt.button === 1) {
      setIsPanning(true);
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }
    // 사각형/삼각형 드로잉 시작
    if ((activeTool === 'DRAW_RECT' || activeTool === 'DRAW_TRIANGLE') && !isDrawing) {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      setDrawingStart(toNormalizedCoords(pos.x, pos.y));
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const dx = e.evt.clientX - lastPanPos.x;
      const dy = e.evt.clientY - lastPanPos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }
    // 사각형/삼각형 드로잉 중
    if (isDrawing && drawingStart && (activeTool === 'DRAW_RECT' || activeTool === 'DRAW_TRIANGLE')) {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const endPoint = toNormalizedCoords(pos.x, pos.y);

      if (activeTool === 'DRAW_RECT') {
        setDrawingPoints([
          drawingStart,
          { x: endPoint.x, y: drawingStart.y },
          endPoint,
          { x: drawingStart.x, y: endPoint.y }
        ]);
      } else {
        // 삼각형: 상단 중앙, 좌하단, 우하단
        const midX = (drawingStart.x + endPoint.x) / 2;
        setDrawingPoints([
          { x: midX, y: drawingStart.y },
          { x: drawingStart.x, y: endPoint.y },
          { x: endPoint.x, y: endPoint.y }
        ]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    // 사각형/삼각형 드로잉 완료
    if (isDrawing && drawingPoints.length >= 3 && (activeTool === 'DRAW_RECT' || activeTool === 'DRAW_TRIANGLE')) {
      completeDrawing();
    }
  };

  // 다각형 클릭 드로잉
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'DRAW_POLYGON') return;
    if (isPanning) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const normalizedPoint = toNormalizedCoords(pos.x, pos.y);
    setDrawingPoints(prev => [...prev, normalizedPoint]);
    setIsDrawing(true);
  };

  // 드로잉 완료
  const completeDrawing = () => {
    if (drawingPoints.length < 3) {
      cancelDrawing();
      return;
    }
    const normalizedArea = calculatePolygonArea(drawingPoints);
    const estimatedArea = floorBoundary ? estimateRealArea(normalizedArea) : 0;
    const newZone: FloorZone = {
      id: `zone-${Date.now()}`,
      floorPlanId: currentPlan!.id,
      type: floorBoundary ? 'PLANNED' : 'FLOOR_BOUNDARY',
      name: floorBoundary ? (newZoneName || `구역 ${currentZones.length + 1}`) : '바닥 영역',
      color: floorBoundary ? newZoneColor : '#9e9e9e',
      opacity: floorBoundary ? newZoneOpacity : 0.2,
      points: drawingPoints,
      estimatedArea: floorBoundary ? estimatedArea : floorArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveZoneWithHistory(newZone);
    setDrawingPoints([]);
    setDrawingStart(null);
    setIsDrawing(false);
    setNewZoneName('');
    setActiveTool('SELECT');
  };

  const cancelDrawing = () => {
    setDrawingPoints([]);
    setDrawingStart(null);
    setIsDrawing(false);
  };

  // 점 편집: 이동 (드래그)
  const handlePointDragEnd = (zoneId: string, pointIndex: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone || !image) return;

    // 드래그된 Circle의 절대 위치 (Stage 기준)
    const absPos = e.target.getAbsolutePosition();
    const newPoint = toNormalizedCoords(absPos.x, absPos.y);

    const newPoints = [...zone.points];
    newPoints[pointIndex] = newPoint;
    const normalizedArea = calculatePolygonArea(newPoints);
    const estimatedArea = zone.type === 'FLOOR_BOUNDARY' ? floorArea : estimateRealArea(normalizedArea);
    saveZoneWithHistory({ ...zone, points: newPoints, estimatedArea, updatedAt: new Date().toISOString() });
  };

  // 점 편집: 추가 (선분 클릭)
  const handleLineClick = (zoneId: string, segmentIndex: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'EDIT_POINTS') return;
    e.cancelBubble = true;
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const newPoint = toNormalizedCoords(pos.x, pos.y);
    const newPoints = [...zone.points];
    newPoints.splice(segmentIndex + 1, 0, newPoint);
    saveZoneWithHistory({ ...zone, points: newPoints, updatedAt: new Date().toISOString() });
  };

  // 점 편집: 삭제 (더블클릭 또는 우클릭)
  const handlePointDelete = (zoneId: string, pointIndex: number, e: Konva.KonvaEventObject<MouseEvent | PointerEvent>) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone || zone.points.length <= 3) {
      alert('최소 3개의 점이 필요합니다.');
      return;
    }
    const newPoints = zone.points.filter((_, i) => i !== pointIndex);
    const normalizedArea = calculatePolygonArea(newPoints);
    const estimatedArea = zone.type === 'FLOOR_BOUNDARY' ? floorArea : estimateRealArea(normalizedArea);
    saveZoneWithHistory({ ...zone, points: newPoints, estimatedArea, updatedAt: new Date().toISOString() });
  };

  // 조닝 선택
  const handleZoneClick = (zoneId: string, e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'SELECT') {
      // Ctrl/Cmd 클릭: 다중 선택
      if (e?.evt.ctrlKey || e?.evt.metaKey) {
        setSelectedZoneIds(prev => prev.includes(zoneId) ? prev.filter(id => id !== zoneId) : [...prev, zoneId]);
      } else {
        setSelectedZoneId(prev => prev === zoneId ? null : zoneId);
        setSelectedZoneIds([]);
      }
    }
  };

  // 구역 전체 이동
  const handleZoneDragEnd = (zoneId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone || !image) return;
    const dx = e.target.x() / (image.width * zoom);
    const dy = e.target.y() / (image.height * zoom);
    const newPoints = zone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    e.target.x(0);
    e.target.y(0);
    saveZoneWithHistory({ ...zone, points: newPoints, updatedAt: new Date().toISOString() });
  };

  // 회전
  const handleRotateZone = (zoneId: string, angleDelta: number) => {
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone) return;
    const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
    const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
    const angleRad = (angleDelta * Math.PI) / 180;
    const newPoints = zone.points.map(p => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      return {
        x: centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
        y: centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
      };
    });
    saveZoneWithHistory({ ...zone, points: newPoints, updatedAt: new Date().toISOString() });
  };

  // 병합 방식 선택
  const [showMergeOptions, setShowMergeOptions] = useState(false);

  // 점이 다각형 내부에 있는지 판별 (Ray casting)
  const isPointInPolygon = (point: ZonePoint, polygon: ZonePoint[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // 두 선분의 교점 계산
  const getLineIntersection = (p1: ZonePoint, p2: ZonePoint, p3: ZonePoint, p4: ZonePoint): ZonePoint | null => {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < 1e-10) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    }
    return null;
  };

  // 병합 실행
  const handleMergeZones = (mergeType: 'CONVEX' | 'UNION' | 'KEEP_ALL' | 'INTERSECTION' | 'SUBTRACT') => {
    if (selectedZoneIds.length < 2) return;
    const zonesToMerge = currentZones.filter(z => selectedZoneIds.includes(z.id));
    if (zonesToMerge.length < 2) return;

    const baseZone = zonesToMerge[0];
    const secondZone = zonesToMerge[1];
    let mergedPoints: ZonePoint[];
    let newName: string;

    if (mergeType === 'CONVEX') {
      // Convex Hull: 외곽선만 (볼록 다각형)
      const allPoints = zonesToMerge.flatMap(z => z.points);
      mergedPoints = computeConvexHull(allPoints);
      newName = zonesToMerge.map(z => z.name).join(' + ');
    } else if (mergeType === 'UNION') {
      // Union: 다각형 합집합
      mergedPoints = computePolygonUnion(zonesToMerge.map(z => z.points));
      newName = zonesToMerge.map(z => z.name).join(' + ');
    } else if (mergeType === 'INTERSECTION') {
      // Intersection: 교집합 - 두 다각형이 겹치는 영역
      mergedPoints = computePolygonIntersection(baseZone.points, secondZone.points);
      newName = `${baseZone.name} ∩ ${secondZone.name}`;
      if (mergedPoints.length < 3) {
        alert('두 영역이 겹치지 않습니다.');
        return;
      }
    } else if (mergeType === 'SUBTRACT') {
      // Subtract: 빼기 - 첫 번째에서 두 번째 제외
      mergedPoints = computePolygonSubtract(baseZone.points, secondZone.points);
      newName = `${baseZone.name} - ${secondZone.name}`;
      if (mergedPoints.length < 3) {
        alert('빼기 결과가 없습니다.');
        return;
      }
    } else {
      // Keep All: 모든 점 유지 (수동 편집 필요)
      mergedPoints = zonesToMerge.flatMap(z => z.points);
      newName = zonesToMerge.map(z => z.name).join(' + ');
    }

    const normalizedArea = calculatePolygonArea(mergedPoints);
    const estimatedArea = estimateRealArea(normalizedArea);

    const mergedZone: FloorZone = {
      id: `zone-${Date.now()}`,
      floorPlanId: currentPlan!.id,
      type: 'PLANNED',
      name: newName,
      color: baseZone.color,
      opacity: baseZone.opacity,
      points: mergedPoints,
      estimatedArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 병합 전 히스토리 저장 (한 번만)
    saveToHistory();
    zonesToMerge.forEach(z => onDeleteZone(z.id));
    onSaveZone(mergedZone);
    setSelectedZoneIds([]);
    setSelectedZoneId(mergedZone.id);
    setShowMergeOptions(false);
  };

  // 다각형 교집합 계산 (Sutherland-Hodgman 알고리즘 기반)
  const computePolygonIntersection = (subjectPolygon: ZonePoint[], clipPolygon: ZonePoint[]): ZonePoint[] => {
    let outputList = [...subjectPolygon];

    for (let i = 0; i < clipPolygon.length; i++) {
      if (outputList.length === 0) return [];
      const inputList = [...outputList];
      outputList = [];

      const edgeStart = clipPolygon[i];
      const edgeEnd = clipPolygon[(i + 1) % clipPolygon.length];

      for (let j = 0; j < inputList.length; j++) {
        const current = inputList[j];
        const previous = inputList[(j + inputList.length - 1) % inputList.length];

        const currentInside = isLeftOfLine(current, edgeStart, edgeEnd);
        const previousInside = isLeftOfLine(previous, edgeStart, edgeEnd);

        if (currentInside) {
          if (!previousInside) {
            const intersection = getLineIntersection(previous, current, edgeStart, edgeEnd);
            if (intersection) outputList.push(intersection);
          }
          outputList.push(current);
        } else if (previousInside) {
          const intersection = getLineIntersection(previous, current, edgeStart, edgeEnd);
          if (intersection) outputList.push(intersection);
        }
      }
    }

    return outputList;
  };

  // 점이 선분의 왼쪽에 있는지 (내부 판별용)
  const isLeftOfLine = (point: ZonePoint, lineStart: ZonePoint, lineEnd: ZonePoint): boolean => {
    return ((lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
            (lineEnd.y - lineStart.y) * (point.x - lineStart.x)) >= 0;
  };

  // 다각형 빼기 계산 (간단한 구현: 첫 번째 다각형에서 두 번째와 겹치지 않는 점들)
  const computePolygonSubtract = (basePolygon: ZonePoint[], subtractPolygon: ZonePoint[]): ZonePoint[] => {
    // 교차점들을 포함한 새 다각형 생성
    const result: ZonePoint[] = [];

    // 기본 다각형의 각 점에 대해
    for (let i = 0; i < basePolygon.length; i++) {
      const current = basePolygon[i];
      const next = basePolygon[(i + 1) % basePolygon.length];

      // 현재 점이 빼는 다각형 외부에 있으면 추가
      if (!isPointInPolygon(current, subtractPolygon)) {
        result.push(current);
      }

      // 현재 선분과 빼는 다각형의 교차점 찾기
      for (let j = 0; j < subtractPolygon.length; j++) {
        const subCurrent = subtractPolygon[j];
        const subNext = subtractPolygon[(j + 1) % subtractPolygon.length];
        const intersection = getLineIntersection(current, next, subCurrent, subNext);
        if (intersection) {
          result.push(intersection);
        }
      }
    }

    // 빼는 다각형의 점 중 기본 다각형 내부에 있는 것들의 반대편 추가
    for (const point of subtractPolygon) {
      if (isPointInPolygon(point, basePolygon)) {
        result.push(point);
      }
    }

    // 중심점 기준으로 각도 정렬
    if (result.length < 3) return result;
    const cx = result.reduce((s, p) => s + p.x, 0) / result.length;
    const cy = result.reduce((s, p) => s + p.y, 0) / result.length;
    result.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

    return result;
  };

  // Convex Hull 계산 (Graham scan)
  const computeConvexHull = (points: ZonePoint[]): ZonePoint[] => {
    if (points.length < 3) return points;
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: ZonePoint, a: ZonePoint, b: ZonePoint) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: ZonePoint[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: ZonePoint[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  };

  // 다각형 합집합 (간단한 구현 - 경계 추적)
  const computePolygonUnion = (polygons: ZonePoint[][]): ZonePoint[] => {
    if (polygons.length === 0) return [];
    if (polygons.length === 1) return polygons[0];

    // 간단한 구현: 모든 점을 각도순으로 정렬하여 외곽 추적
    const allPoints = polygons.flatMap(p => p);

    // 중심점 계산
    const cx = allPoints.reduce((s, p) => s + p.x, 0) / allPoints.length;
    const cy = allPoints.reduce((s, p) => s + p.y, 0) / allPoints.length;

    // 각도 기준 정렬 (시계 방향)
    const sorted = [...allPoints].sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });

    // 중복 제거 (가까운 점)
    const threshold = 0.005;
    const filtered: ZonePoint[] = [];
    for (const p of sorted) {
      if (filtered.length === 0 ||
          Math.abs(p.x - filtered[filtered.length - 1].x) > threshold ||
          Math.abs(p.y - filtered[filtered.length - 1].y) > threshold) {
        filtered.push(p);
      }
    }

    return filtered.length >= 3 ? filtered : sorted;
  };

  // ========================================
  // OpenCV 자동 바닥 영역 감지
  // ========================================
  const detectFloorBoundary = async () => {
    if (!image || !currentPlan) {
      alert('도면을 먼저 업로드하세요.');
      return;
    }

    // OpenCV.js 로드 확인
    if (!window.cv || !window.cvReady) {
      alert('OpenCV.js가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsDetecting(true);
    setDetectedContours([]);

    try {
      const cv = window.cv;

      // Canvas에 이미지 그리기
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context 생성 실패');
      ctx.drawImage(image, 0, 0);

      // OpenCV Mat으로 변환
      const src = cv.imread(canvas);
      const gray = new cv.Mat();
      const processed = new cv.Mat();
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();

      // Grayscale 변환
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // 감지 모드에 따른 처리
      if (detectSettings.detectMode === 'canny') {
        // Canny 엣지 감지 - 건축 도면에 최적
        cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
        cv.Canny(gray, processed, detectSettings.cannyLow, detectSettings.cannyHigh);
        // 엣지를 두껍게 (연결되지 않은 선 연결)
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.dilate(processed, processed, kernel);
        cv.morphologyEx(processed, processed, cv.MORPH_CLOSE, kernel);
        kernel.delete();
      } else if (detectSettings.detectMode === 'adaptive') {
        // 적응형 이진화 - 조명이 불균일한 경우
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
        cv.adaptiveThreshold(gray, processed, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          detectSettings.invertColors ? cv.THRESH_BINARY : cv.THRESH_BINARY_INV, 11, 2);
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.morphologyEx(processed, processed, cv.MORPH_CLOSE, kernel);
        kernel.delete();
      } else {
        // 기본 임계값 이진화
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
        if (detectSettings.invertColors) {
          cv.threshold(gray, processed, detectSettings.threshold, 255, cv.THRESH_BINARY_INV);
        } else {
          cv.threshold(gray, processed, detectSettings.threshold, 255, cv.THRESH_BINARY);
        }
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.morphologyEx(processed, processed, cv.MORPH_CLOSE, kernel);
        kernel.delete();
      }

      // 윤곽선 찾기 - 내부 공간 포함 여부에 따라 모드 변경
      const retrievalMode = detectSettings.detectInternal ? cv.RETR_TREE : cv.RETR_EXTERNAL;
      cv.findContours(processed, contours, hierarchy, retrievalMode, cv.CHAIN_APPROX_SIMPLE);

      const detectedPolygons: ZonePoint[][] = [];
      const minAreaPixels = image.width * image.height * detectSettings.minArea;
      const maxAreaPixels = image.width * image.height * 0.95; // 전체 이미지의 95% 이상은 제외

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);

        // 면적 필터링 (너무 작거나 너무 큰 것 제외)
        if (area < minAreaPixels || area > maxAreaPixels) continue;

        // 윤곽선 단순화 (Douglas-Peucker)
        const epsilon = detectSettings.simplify * cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);

        // 정규화 좌표로 변환
        const points: ZonePoint[] = [];
        for (let j = 0; j < approx.rows; j++) {
          const x = approx.data32S[j * 2] / image.width;
          const y = approx.data32S[j * 2 + 1] / image.height;
          points.push({ x, y });
        }

        // 최소 3개 점, 합리적인 형태인지 확인
        if (points.length >= 3 && points.length <= 100) {
          detectedPolygons.push(points);
        }

        approx.delete();
      }

      // 면적 기준 내림차순 정렬
      detectedPolygons.sort((a, b) => {
        const areaA = calculatePolygonArea(a);
        const areaB = calculatePolygonArea(b);
        return areaB - areaA;
      });

      // 메모리 해제
      src.delete();
      gray.delete();
      processed.delete();
      contours.delete();
      hierarchy.delete();

      if (detectedPolygons.length === 0) {
        alert('윤곽선을 감지하지 못했습니다. 감지 모드나 설정을 조정해보세요.');
        setIsDetecting(false);
        return;
      }

      // 결과 저장 (모든 윤곽선 또는 가장 큰 것만)
      if (detectSettings.detectAll) {
        setDetectedContours(detectedPolygons);
      } else {
        setDetectedContours([detectedPolygons[0]]);
      }

      setShowDetectSettings(true);

    } catch (error) {
      console.error('OpenCV 감지 오류:', error);
      alert('윤곽선 감지 중 오류가 발생했습니다.');
    } finally {
      setIsDetecting(false);
    }
  };

  // 감지된 윤곽선을 조닝으로 적용
  const applyDetectedContours = (index?: number) => {
    if (!currentPlan) return;

    const contoursToApply = index !== undefined ? [detectedContours[index]] : detectedContours;

    // 적용 전 히스토리 저장 (한 번만)
    saveToHistory();
    contoursToApply.forEach((points, i) => {
      const isFirst = i === 0 && !floorBoundary;
      const newZone: FloorZone = {
        id: `zone-${Date.now()}-${i}`,
        floorPlanId: currentPlan.id,
        type: isFirst ? 'FLOOR_BOUNDARY' : 'PLANNED',
        name: isFirst ? '바닥 영역' : `감지 구역 ${i + 1}`,
        color: isFirst ? '#9e9e9e' : ZONE_COLORS[i % ZONE_COLORS.length],
        opacity: isFirst ? 0.2 : 0.4,
        points,
        estimatedArea: isFirst ? floorArea : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveZone(newZone);
    });

    setDetectedContours([]);
    setShowDetectSettings(false);
  };

  // 감지 취소
  const cancelDetection = () => {
    setDetectedContours([]);
    setShowDetectSettings(false);
  };

  // 호실 연결
  const handleLinkUnit = (unitId: string) => {
    if (!linkTargetZoneId) return;
    const zone = currentZones.find(z => z.id === linkTargetZoneId);
    if (!zone) return;
    const unit = units.find(u => u.id === unitId);
    saveZoneWithHistory({
      ...zone,
      type: 'LINKED',
      linkedUnitId: unitId,
      name: unit ? `${unit.unitNumber}호` : zone.name,
      updatedAt: new Date().toISOString()
    });
    setShowLinkModal(false);
    setLinkTargetZoneId(null);
  };

  const handleUnlinkUnit = (zoneId: string) => {
    const zone = currentZones.find(z => z.id === zoneId);
    if (!zone) return;
    saveZoneWithHistory({ ...zone, type: 'PLANNED', linkedUnitId: undefined, updatedAt: new Date().toISOString() });
  };

  // 이름 수정
  const handleUpdateZoneName = () => {
    if (!selectedZoneId) return;
    const zone = currentZones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    saveZoneWithHistory({ ...zone, name: editingZoneName, updatedAt: new Date().toISOString() });
    setShowEditNameModal(false);
  };

  // 숨기기 토글
  const toggleZoneVisibility = (zoneId: string) => {
    setHiddenZoneIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) newSet.delete(zoneId);
      else newSet.add(zoneId);
      return newSet;
    });
  };

  // 이미지를 캔버스에 맞추는 줌/오프셋 계산 (DOM에서 직접 크기 읽음)
  const fitImageToCanvas = (imgWidth: number, imgHeight: number) => {
    // containerRef에서 직접 크기를 읽어옴 (state가 아닌 실시간 값)
    const container = containerRef.current;
    if (!container) return { zoom: 1, offsetX: 0, offsetY: 0 };

    const rect = container.getBoundingClientRect();
    const padding = 40; // 여백
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return { zoom: 1, offsetX: 0, offsetY: 0 };
    }

    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1); // 최대 100%

    // 중앙 정렬 오프셋
    const offsetX = (rect.width - imgWidth * fitZoom) / 2;
    const offsetY = (rect.height - imgHeight * fitZoom) / 2;

    return { zoom: fitZoom, offsetX, offsetY };
  };

  // 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const newPlan: FloorPlan = {
          id: `plan-${Date.now()}`,
          propertyId,
          buildingId: building.id,
          floorNumber,
          fileName: file.name,
          fileType: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
          fileData: dataUrl,
          width: img.width,
          height: img.height,
          uploadedAt: new Date().toISOString()
        };
        onSaveFloorPlan(newPlan);
        // 업로드 후 즉시 이미지 설정 및 캔버스에 맞게 표시
        setImage(img);
        const fit = fitImageToCanvas(img.width, img.height);
        setZoom(fit.zoom);
        setPanOffset({ x: fit.offsetX, y: fit.offsetY });
        setShowUploadModal(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectExisting = (planId: string) => {
    const sourcePlan = allFloorPlans.find(p => p.id === planId);
    if (!sourcePlan) return;
    const newPlan: FloorPlan = {
      ...sourcePlan,
      id: `plan-${Date.now()}`,
      propertyId,
      buildingId: building.id,
      floorNumber,
      uploadedAt: new Date().toISOString()
    };
    onSaveFloorPlan(newPlan);
    // 기존 도면 선택 후 이미지 로드 및 캔버스에 맞게 표시
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
      const fit = fitImageToCanvas(img.width, img.height);
      setZoom(fit.zoom);
      setPanOffset({ x: fit.offsetX, y: fit.offsetY });
    };
    img.src = sourcePlan.fileData;
    setShowSelectExistingModal(false);
  };

  const handlePrint = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${propertyName} ${building.name} ${getFloorLabel(floorNumber)} 도면</title>
      <style>@page { size: A4 landscape; margin: 10mm; } body { margin: 0; display: flex; justify-content: center; align-items: center; } img { max-width: 100%; max-height: 100vh; }</style>
      </head><body><img src="${dataUrl}" /><script>window.onload = () => { window.print(); window.close(); }</script></body></html>`);
  };

  // 조닝 렌더링
  const renderZone = (zone: FloorZone) => {
    const points = zone.points.flatMap(p => {
      const cp = toCanvasCoords(p);
      return [cp.x, cp.y];
    });

    const isSelected = selectedZoneId === zone.id || selectedZoneIds.includes(zone.id);
    const linkedUnit = zone.linkedUnitId ? units.find(u => u.id === zone.linkedUnitId) : null;
    const contract = linkedUnit ? leaseContracts.find(c => c.targetIds.includes(linkedUnit.id) && c.status === 'ACTIVE') : null;
    const tenant = contract ? stakeholders.find(s => contract.tenantIds.includes(s.id)) : null;

    // 중심점
    const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
    const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
    const center = toCanvasCoords({ x: centerX, y: centerY });

    // 레이블 크기: 화면상 고정 크기 유지 (줌과 무관)
    const labelWidth = 120;
    const labelHeight = zone.type === 'LINKED' ? 56 : 44;
    const fontSize = 13;
    const subFontSize = 11;
    const areaFontSize = 10;

    const isDraggable = isSelected && activeTool === 'SELECT';

    // 면적 텍스트
    const areaText = zone.type === 'LINKED' && linkedUnit
      ? `${linkedUnit.area.toFixed(1)}㎡`
      : zone.type === 'FLOOR_BOUNDARY'
        ? `${floorArea.toFixed(1)}㎡`
        : zone.estimatedArea
          ? `≈${zone.estimatedArea.toFixed(1)}㎡`
          : '';

    return (
      <Group key={zone.id} draggable={isDraggable} onDragEnd={(e) => handleZoneDragEnd(zone.id, e)}>
        <Line
          points={points}
          closed
          fill={zone.color}
          opacity={zone.opacity}
          stroke={isSelected ? '#1a73e8' : zone.color}
          strokeWidth={isSelected ? 3 : 1}
          onClick={(e) => handleZoneClick(zone.id, e)}
          onTap={() => handleZoneClick(zone.id)}
        />

        {showLabels && (
          <Group x={center.x} y={center.y}>
            {/* 레이블 배경 */}
            <Rect
              x={-labelWidth / 2}
              y={-labelHeight / 2}
              width={labelWidth}
              height={labelHeight}
              fill="white"
              opacity={0.95}
              cornerRadius={6}
              stroke={isSelected ? '#1a73e8' : '#dadce0'}
              strokeWidth={isSelected ? 2 : 1}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.15}
              shadowOffsetY={2}
            />
            {/* 구역 이름 */}
            <Text
              x={-labelWidth / 2}
              y={-labelHeight / 2 + 6}
              width={labelWidth}
              text={zone.name}
              fontSize={fontSize}
              fontStyle="bold"
              fill="#202124"
              align="center"
              verticalAlign="middle"
            />
            {/* 연결된 호실: 임차인/상태 */}
            {zone.type === 'LINKED' && linkedUnit && (
              <Text
                x={-labelWidth / 2}
                y={-labelHeight / 2 + 6 + fontSize + 2}
                width={labelWidth}
                text={tenant ? tenant.name : (linkedUnit.status === 'VACANT' ? '공실' : linkedUnit.usage)}
                fontSize={subFontSize}
                fill={tenant ? '#1a73e8' : '#5f6368'}
                align="center"
                verticalAlign="middle"
              />
            )}
            {/* 면적 */}
            {areaText && (
              <Text
                x={-labelWidth / 2}
                y={labelHeight / 2 - areaFontSize - 6}
                width={labelWidth}
                text={areaText}
                fontSize={areaFontSize}
                fill={zone.type === 'LINKED' ? '#202124' : '#9aa0a6'}
                fontStyle={zone.type === 'LINKED' ? 'bold' : 'normal'}
                align="center"
                verticalAlign="middle"
              />
            )}
          </Group>
        )}

      </Group>
    );
  };

  // 점 편집용 렌더링 (Group 밖에서 독립적으로)
  const renderZoneEditPoints = (zone: FloorZone) => {
    const isSelected = selectedZoneId === zone.id || selectedZoneIds.includes(zone.id);
    if (activeTool !== 'EDIT_POINTS' && !isSelected) return null;

    return (
      <React.Fragment key={`edit-${zone.id}-${zone.updatedAt}`}>
        {/* 선분 클릭 영역 (점 추가용) - 점보다 먼저 렌더링하여 점이 위에 오도록 */}
        {activeTool === 'EDIT_POINTS' && zone.points.map((p, i) => {
          const next = zone.points[(i + 1) % zone.points.length];
          const cp1 = toCanvasCoords(p);
          const cp2 = toCanvasCoords(next);
          return (
            <Line key={`seg-${zone.id}-${i}-${zone.updatedAt}`} points={[cp1.x, cp1.y, cp2.x, cp2.y]} stroke="transparent" strokeWidth={10}
              onClick={(e) => handleLineClick(zone.id, i, e)} onTap={(e) => handleLineClick(zone.id, i, e)} />
          );
        })}

        {/* 편집 모드: 점들 - 선분 위에 렌더링되어 이벤트 우선 처리 */}
        {zone.points.map((p, i) => {
          const cp = toCanvasCoords(p);
          // 편집 모드에서는 더 큰 히트 영역
          const visualRadius = activeTool === 'EDIT_POINTS' ? 8 : 5;
          const hitRadius = activeTool === 'EDIT_POINTS' ? 18 : 10; // 클릭 감지 영역 확대
          return (
            <Circle
              key={`pt-${zone.id}-${i}-${p.x.toFixed(4)}-${p.y.toFixed(4)}`}
              x={cp.x}
              y={cp.y}
              radius={visualRadius}
              fill={activeTool === 'EDIT_POINTS' ? '#fff' : '#1a73e8'}
              stroke="#1a73e8"
              strokeWidth={activeTool === 'EDIT_POINTS' ? 3 : 2}
              hitStrokeWidth={hitRadius}
              draggable={activeTool === 'EDIT_POINTS'}
              onDragEnd={(e) => handlePointDragEnd(zone.id, i, e)}
              onDblClick={(e) => { e.cancelBubble = true; handlePointDelete(zone.id, i, e); }}
              onContextMenu={(e) => { e.cancelBubble = true; handlePointDelete(zone.id, i, e); }}
              style={{ cursor: activeTool === 'EDIT_POINTS' ? 'move' : 'default' }}
            />
          );
        })}
      </React.Fragment>
    );
  };

  // 드로잉 중인 다각형
  const renderDrawingPolygon = () => {
    if (drawingPoints.length === 0) return null;
    const points = drawingPoints.flatMap(p => {
      const cp = toCanvasCoords(p);
      return [cp.x, cp.y];
    });
    return (
      <Group>
        <Line points={points} stroke={newZoneColor} strokeWidth={2} dash={[5, 5]} closed={activeTool !== 'DRAW_POLYGON'} fill={activeTool !== 'DRAW_POLYGON' ? newZoneColor : undefined} opacity={0.3} />
        {drawingPoints.map((p, i) => {
          const cp = toCanvasCoords(p);
          return <Circle key={i} x={cp.x} y={cp.y} radius={5} fill={newZoneColor} />;
        })}
      </Group>
    );
  };

  if (!isOpen) return null;

  const selectedZone = selectedZoneId ? currentZones.find(z => z.id === selectedZoneId) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa]">
          <div className="flex items-center gap-3">
            <FileImage size={20} className="text-[#1a73e8]" />
            <div>
              <h2 className="font-black text-sm text-[#202124]">{propertyName} · {building.name} · {getFloorLabel(floorNumber)} 도면</h2>
              <p className="text-[10px] text-[#5f6368]">공부상 면적: {floorArea.toFixed(1)}㎡ · 조닝 {currentZones.length}개</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 hover:bg-[#e8f0fe] rounded-lg transition-colors" title="인쇄"><Printer size={18} className="text-[#5f6368]" /></button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><X size={18} className="text-[#5f6368]" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 좌측: 도구 패널 */}
          <div className="w-14 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col items-center py-3 gap-1">
            <button onClick={() => setActiveTool('SELECT')} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'SELECT' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'}`} title="선택 (드래그로 이동)">
              <MousePointer size={18} />
            </button>
            <button onClick={() => setActiveTool('PAN')} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'PAN' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'}`} title="화면 이동">
              <Move size={18} />
            </button>
            <div className="w-8 border-t border-[#dadce0] my-2" />
            <button onClick={() => setActiveTool('DRAW_POLYGON')} disabled={!currentPlan} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'DRAW_POLYGON' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`} title="다각형 그리기">
              <Pencil size={18} />
            </button>
            <button onClick={() => setActiveTool('DRAW_RECT')} disabled={!currentPlan} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'DRAW_RECT' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`} title="사각형 그리기">
              <Square size={18} />
            </button>
            <button onClick={() => setActiveTool('DRAW_TRIANGLE')} disabled={!currentPlan} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'DRAW_TRIANGLE' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`} title="삼각형 그리기">
              <Triangle size={18} />
            </button>
            <button onClick={() => setActiveTool('EDIT_POINTS')} disabled={!currentPlan} className={`p-2.5 rounded-lg transition-colors ${activeTool === 'EDIT_POINTS' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`} title="점 편집">
              <Scissors size={18} />
            </button>
            <div className="w-8 border-t border-[#dadce0] my-2" />
            <button onClick={() => handleZoom(0.2)} className="p-2.5 hover:bg-[#e8eaed] rounded-lg text-[#5f6368]" title="확대"><ZoomIn size={18} /></button>
            <button onClick={() => handleZoom(-0.2)} className="p-2.5 hover:bg-[#e8eaed] rounded-lg text-[#5f6368]" title="축소"><ZoomOut size={18} /></button>
            <button onClick={() => {
              if (image) {
                const fit = fitImageToCanvas(image.width, image.height);
                setZoom(fit.zoom);
                setPanOffset({ x: fit.offsetX, y: fit.offsetY });
              }
            }} className="p-2.5 hover:bg-[#e8eaed] rounded-lg text-[#5f6368]" title="화면에 맞추기"><RotateCcw size={18} /></button>
            <div className="w-8 border-t border-[#dadce0] my-2" />
            {/* 실행취소/다시실행 */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-2.5 rounded-lg transition-colors ${historyIndex > 0 ? 'hover:bg-[#e8eaed] text-[#5f6368]' : 'text-[#dadce0]'}`}
              title="실행취소 (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= zoneHistory.length - 1}
              className={`p-2.5 rounded-lg transition-colors ${historyIndex < zoneHistory.length - 1 ? 'hover:bg-[#e8eaed] text-[#5f6368]' : 'text-[#dadce0]'}`}
              title="다시실행 (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
            <div className="flex-1" />
            <button onClick={() => setShowZones(!showZones)} className={`p-2.5 rounded-lg transition-colors ${showZones ? 'text-[#1a73e8]' : 'text-[#9aa0a6]'}`} title="조닝 표시/숨김">
              {showZones ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button onClick={() => setShowLabels(!showLabels)} className={`p-2.5 rounded-lg transition-colors ${showLabels ? 'text-[#1a73e8]' : 'text-[#9aa0a6]'}`} title="레이블 표시/숨김">
              <Layers size={18} />
            </button>
            <div className="w-8 border-t border-[#dadce0] my-2" />
            {/* OpenCV 자동 감지 버튼 */}
            <button
              onClick={detectFloorBoundary}
              disabled={!currentPlan || isDetecting}
              className={`p-2.5 rounded-lg transition-colors ${detectedContours.length > 0 ? 'bg-[#34a853] text-white' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`}
              title="바닥 영역 자동 감지 (OpenCV)"
            >
              {isDetecting ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            </button>
            <button
              onClick={() => setShowDetectSettings(!showDetectSettings)}
              disabled={!currentPlan}
              className={`p-2.5 rounded-lg transition-colors ${showDetectSettings ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] text-[#5f6368]'} disabled:opacity-30`}
              title="자동 감지 설정"
            >
              <Settings2 size={18} />
            </button>
          </div>

          {/* 중앙: 캔버스 */}
          <div ref={containerRef} className="flex-1 bg-[#e8eaed] overflow-hidden relative">
            {!currentPlan ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <FileImage size={64} className="text-[#9aa0a6]" />
                <p className="text-[#5f6368] text-sm">도면이 없습니다</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-[#1a73e8] text-white text-xs font-bold rounded-lg hover:bg-[#1557b0] flex items-center gap-2">
                    <Upload size={14} /> 업로드
                  </button>
                  {allFloorPlans.length > 0 && (
                    <button onClick={() => setShowSelectExistingModal(true)} className="px-4 py-2 border border-[#dadce0] text-[#5f6368] text-xs font-bold rounded-lg hover:bg-[#f8f9fa] flex items-center gap-2">
                      <Layers size={14} /> 기존 도면 선택
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Stage ref={stageRef} width={containerSize.width} height={containerSize.height}
                onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleStageClick}>
                <Layer>
                  {image && <KonvaImage image={image} x={panOffset.x} y={panOffset.y} width={image.width * zoom} height={image.height * zoom} />}
                  {showZones && visibleZones.map(renderZone)}
                  {showZones && visibleZones.map(renderZoneEditPoints)}
                  {isDrawing && renderDrawingPolygon()}
                  {/* 감지된 윤곽선 미리보기 */}
                  {detectedContours.map((contour, i) => {
                    const points = contour.flatMap(p => {
                      const cp = toCanvasCoords(p);
                      return [cp.x, cp.y];
                    });
                    return (
                      <Line
                        key={`detected-${i}`}
                        points={points}
                        closed
                        stroke="#34a853"
                        strokeWidth={3}
                        dash={[8, 4]}
                        fill="#34a853"
                        opacity={0.2}
                      />
                    );
                  })}
                </Layer>
              </Stage>
            )}

            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 text-white text-[10px] font-mono rounded">{(zoom * 100).toFixed(0)}%</div>

            {/* OpenCV 자동 감지 설정 패널 */}
            {showDetectSettings && (
              <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg border border-[#dadce0] p-4 w-72 z-10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-sm text-[#202124] flex items-center gap-2">
                    <Wand2 size={16} className="text-[#1a73e8]" /> 자동 감지 설정
                  </h4>
                  <button onClick={() => setShowDetectSettings(false)} className="p-1 hover:bg-[#f8f9fa] rounded">
                    <X size={14} className="text-[#5f6368]" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 감지 모드 선택 */}
                  <div>
                    <label className="text-[10px] font-bold text-[#5f6368] mb-1.5 block">감지 모드</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDetectSettings(prev => ({ ...prev, detectMode: 'canny' }))}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${detectSettings.detectMode === 'canny' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                      >
                        Canny (권장)
                      </button>
                      <button
                        onClick={() => setDetectSettings(prev => ({ ...prev, detectMode: 'adaptive' }))}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${detectSettings.detectMode === 'adaptive' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                      >
                        적응형
                      </button>
                      <button
                        onClick={() => setDetectSettings(prev => ({ ...prev, detectMode: 'threshold' }))}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${detectSettings.detectMode === 'threshold' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                      >
                        임계값
                      </button>
                    </div>
                    <p className="text-[9px] text-[#9aa0a6] mt-1">
                      {detectSettings.detectMode === 'canny' && '건축 도면에 최적화된 엣지 감지'}
                      {detectSettings.detectMode === 'adaptive' && '조명이 불균일한 이미지용'}
                      {detectSettings.detectMode === 'threshold' && '단순 이진화 (흑백 대비가 명확할 때)'}
                    </p>
                  </div>

                  {/* Canny 모드 설정 */}
                  {detectSettings.detectMode === 'canny' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#5f6368]">하한값</label>
                          <span className="text-[10px] text-[#1a73e8] font-bold">{detectSettings.cannyLow}</span>
                        </div>
                        <input type="range" min="10" max="150" value={detectSettings.cannyLow}
                          onChange={e => setDetectSettings(prev => ({ ...prev, cannyLow: parseInt(e.target.value) }))}
                          className="w-full" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#5f6368]">상한값</label>
                          <span className="text-[10px] text-[#1a73e8] font-bold">{detectSettings.cannyHigh}</span>
                        </div>
                        <input type="range" min="50" max="300" value={detectSettings.cannyHigh}
                          onChange={e => setDetectSettings(prev => ({ ...prev, cannyHigh: parseInt(e.target.value) }))}
                          className="w-full" />
                      </div>
                    </div>
                  )}

                  {/* 임계값 모드 설정 */}
                  {detectSettings.detectMode === 'threshold' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-[#5f6368]">이진화 임계값</label>
                        <span className="text-[10px] text-[#1a73e8] font-bold">{detectSettings.threshold}</span>
                      </div>
                      <input type="range" min="0" max="255" value={detectSettings.threshold}
                        onChange={e => setDetectSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                        className="w-full" />
                    </div>
                  )}

                  {/* 공통 설정 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-[#5f6368]">최소 영역</label>
                        <span className="text-[10px] text-[#1a73e8] font-bold">{(detectSettings.minArea * 100).toFixed(1)}%</span>
                      </div>
                      <input type="range" min="0.001" max="0.1" step="0.001" value={detectSettings.minArea}
                        onChange={e => setDetectSettings(prev => ({ ...prev, minArea: parseFloat(e.target.value) }))}
                        className="w-full" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-[#5f6368]">단순화</label>
                        <span className="text-[10px] text-[#1a73e8] font-bold">{(detectSettings.simplify * 1000).toFixed(1)}</span>
                      </div>
                      <input type="range" min="0.0005" max="0.01" step="0.0005" value={detectSettings.simplify}
                        onChange={e => setDetectSettings(prev => ({ ...prev, simplify: parseFloat(e.target.value) }))}
                        className="w-full" />
                    </div>
                  </div>

                  {/* 옵션 체크박스 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={detectSettings.detectInternal}
                        onChange={e => setDetectSettings(prev => ({ ...prev, detectInternal: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#dadce0]" />
                      <span className="text-[10px] text-[#5f6368]">내부 공간</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={detectSettings.detectAll}
                        onChange={e => setDetectSettings(prev => ({ ...prev, detectAll: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#dadce0]" />
                      <span className="text-[10px] text-[#5f6368]">모든 윤곽선</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={detectSettings.invertColors}
                        onChange={e => setDetectSettings(prev => ({ ...prev, invertColors: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#dadce0]" />
                      <span className="text-[10px] text-[#5f6368]">반전</span>
                    </label>
                  </div>

                  {/* 감지 버튼 */}
                  <button
                    onClick={detectFloorBoundary}
                    disabled={isDetecting}
                    className="w-full px-4 py-2.5 bg-[#1a73e8] text-white text-xs font-bold rounded-lg hover:bg-[#1557b0] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDetecting ? (
                      <><Loader2 size={14} className="animate-spin" /> 감지 중...</>
                    ) : (
                      <><Wand2 size={14} /> 영역 감지 실행</>
                    )}
                  </button>
                </div>

                {/* 감지 결과 */}
                {detectedContours.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#dadce0]">
                    <h5 className="text-[10px] font-black text-[#5f6368] uppercase mb-2">
                      감지 결과: {detectedContours.length}개 영역
                    </h5>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {detectedContours.map((contour, i) => {
                        const area = calculatePolygonArea(contour);
                        return (
                          <div key={i} className="flex items-center justify-between p-2 bg-[#f8f9fa] rounded-lg text-[10px]">
                            <span className="font-bold text-[#202124]">영역 {i + 1}</span>
                            <span className="text-[#5f6368]">{contour.length}개 점 · {(area * 100).toFixed(1)}%</span>
                            <button
                              onClick={() => applyDetectedContours(i)}
                              className="px-2 py-1 bg-[#34a853] text-white rounded text-[9px] font-bold hover:bg-[#2e9248]"
                            >
                              적용
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => applyDetectedContours()}
                        className="flex-1 px-3 py-2 bg-[#34a853] text-white text-[10px] font-bold rounded-lg hover:bg-[#2e9248] flex items-center justify-center gap-1"
                      >
                        <Layers size={12} /> 전체 적용
                      </button>
                      <button
                        onClick={cancelDetection}
                        className="px-3 py-2 border border-[#dadce0] text-[#5f6368] text-[10px] font-bold rounded-lg hover:bg-[#f8f9fa]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isDrawing && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#1a73e8] text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-3">
                <span>{activeTool === 'DRAW_POLYGON' ? `클릭하여 점 추가 · ${drawingPoints.length}개 점` : '드래그하여 도형 그리기'}</span>
                {activeTool === 'DRAW_POLYGON' && <button onClick={completeDrawing} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30">완료</button>}
                <button onClick={cancelDrawing} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30">취소</button>
              </div>
            )}

            {/* 감지 진행 중 표시 */}
            {isDetecting && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#34a853] text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>OpenCV로 바닥 영역 감지 중...</span>
              </div>
            )}

            {/* 감지 결과 빠른 액션 (설정 패널 닫혀있을 때) */}
            {detectedContours.length > 0 && !showDetectSettings && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#34a853] text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-3">
                <Wand2 size={14} />
                <span>{detectedContours.length}개 영역 감지됨</span>
                <button onClick={() => applyDetectedContours()} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30">전체 적용</button>
                <button onClick={() => setShowDetectSettings(true)} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30">설정</button>
                <button onClick={cancelDetection} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30">취소</button>
              </div>
            )}
          </div>

          {/* 우측: 속성 패널 */}
          <div className="w-80 bg-white border-l border-[#dadce0] flex flex-col overflow-hidden">
            {/* 새 조닝 설정 */}
            <div className="p-3 border-b border-[#dadce0]">
              <h3 className="text-[11px] font-black text-[#5f6368] uppercase mb-2">새 조닝 설정</h3>
              <div className="space-y-2">
                <input type="text" placeholder="영역 이름" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#dadce0] rounded-lg" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5f6368] w-10">색상</span>
                  <div className="flex gap-1 flex-wrap flex-1">
                    {ZONE_COLORS.map(c => (
                      <button key={c} onClick={() => setNewZoneColor(c)} className={`w-6 h-6 rounded ${newZoneColor === c ? 'ring-2 ring-offset-1 ring-[#1a73e8]' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5f6368] w-10">투명도</span>
                  <input type="range" min="0.1" max="0.8" step="0.1" value={newZoneOpacity} onChange={e => setNewZoneOpacity(parseFloat(e.target.value))} className="flex-1" />
                  <span className="text-[10px] text-[#5f6368] w-10">{(newZoneOpacity * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* 조닝 목록 */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-black text-[#5f6368] uppercase">조닝 목록 ({currentZones.length})</h3>
                {currentZones.length >= 2 && (
                  <span className="text-[9px] text-[#9aa0a6]">체크박스로 다중 선택 → 병합</span>
                )}
              </div>
              {currentZones.length === 0 ? (
                <p className="text-[10px] text-[#9aa0a6] text-center py-4">{currentPlan ? '도형 도구로 영역을 그려주세요' : '도면을 먼저 업로드하세요'}</p>
              ) : (
                <div className="space-y-1.5">
                  {currentZones.map(zone => {
                    const isSelected = selectedZoneId === zone.id;
                    const isMultiSelected = selectedZoneIds.includes(zone.id);
                    const isHidden = hiddenZoneIds.has(zone.id);
                    const linkedUnit = zone.linkedUnitId ? units.find(u => u.id === zone.linkedUnitId) : null;
                    const areaText = zone.type === 'LINKED' && linkedUnit
                      ? `${linkedUnit.area.toFixed(1)}㎡`
                      : zone.type === 'FLOOR_BOUNDARY'
                        ? `${floorArea.toFixed(1)}㎡`
                        : zone.estimatedArea ? `≈${zone.estimatedArea.toFixed(1)}㎡` : '';
                    return (
                      <div key={zone.id}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${isSelected || isMultiSelected ? 'border-[#1a73e8] bg-[#e8f0fe]' : 'border-[#dadce0] hover:bg-[#f8f9fa]'} ${isHidden ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          {/* 다중 선택 체크박스 */}
                          {currentZones.length >= 2 && zone.type !== 'FLOOR_BOUNDARY' && (
                            <input
                              type="checkbox"
                              checked={isMultiSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (isMultiSelected) {
                                  setSelectedZoneIds(prev => prev.filter(id => id !== zone.id));
                                } else {
                                  setSelectedZoneIds(prev => [...prev, zone.id]);
                                  setSelectedZoneId(null);
                                }
                              }}
                              className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] cursor-pointer"
                            />
                          )}
                          <div
                            className="flex items-center gap-2 flex-1 min-w-0"
                            onClick={() => {
                              setSelectedZoneId(prev => prev === zone.id ? null : zone.id);
                              setSelectedZoneIds([]);
                            }}
                          >
                            <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: zone.color }} />
                            <span className="text-sm font-bold text-[#202124] flex-1 truncate">{zone.name}</span>
                            {zone.type === 'FLOOR_BOUNDARY' && <span className="text-[9px] px-1.5 py-0.5 bg-[#9e9e9e] text-white rounded flex-shrink-0">기준</span>}
                            {zone.type === 'LINKED' && <span className="text-[9px] px-1.5 py-0.5 bg-[#34a853] text-white rounded flex-shrink-0">연결</span>}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleZoneVisibility(zone.id); }} className="p-1 hover:bg-[#dadce0] rounded flex-shrink-0" title={isHidden ? '표시' : '숨기기'}>
                            {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                        {areaText && (
                          <p className={`text-xs mt-1 ${zone.type === 'LINKED' ? 'font-bold text-[#202124]' : 'text-[#5f6368]'} ${currentZones.length >= 2 && zone.type !== 'FLOOR_BOUNDARY' ? 'ml-6' : ''}`}>
                            {zone.type === 'FLOOR_BOUNDARY' ? '기준 면적' : zone.type === 'LINKED' ? '실제 면적' : '추정 면적'}: {areaText}
                          </p>
                        )}
                        {linkedUnit && <p className={`text-[10px] text-[#1a73e8] mt-0.5 ${currentZones.length >= 2 && zone.type !== 'FLOOR_BOUNDARY' ? 'ml-6' : ''}`}>→ {linkedUnit.unitNumber}호 ({linkedUnit.usage})</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 선택된 조닝 액션 */}
            {(selectedZone || selectedZoneIds.length > 0) && (
              <div className="p-3 border-t border-[#dadce0] bg-[#f8f9fa]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-black text-[#5f6368] uppercase">
                    {selectedZoneIds.length > 1 ? `${selectedZoneIds.length}개 선택됨` : '선택된 영역'}
                  </h3>
                  {selectedZoneIds.length > 0 && (
                    <button
                      onClick={() => setSelectedZoneIds([])}
                      className="text-[9px] text-[#5f6368] hover:text-[#202124]"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {/* 병합 (다중 선택 시) */}
                  {selectedZoneIds.length >= 2 && (
                    <div className="relative w-full mb-2">
                      <p className="text-[9px] text-[#5f6368] mb-1.5">영역 연산 (첫 번째 기준):</p>
                      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                        <button onClick={() => handleMergeZones('UNION')} className="px-2 py-1.5 bg-[#9c27b0] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[#7b1fa2]">
                          합집합
                        </button>
                        <button onClick={() => handleMergeZones('INTERSECTION')} className="px-2 py-1.5 bg-[#00bcd4] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[#00acc1]">
                          교집합
                        </button>
                        <button onClick={() => handleMergeZones('SUBTRACT')} className="px-2 py-1.5 bg-[#ff5722] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[#f4511e]">
                          빼기
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleMergeZones('CONVEX')} className="flex-1 px-2 py-1.5 bg-[#607d8b] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[#546e7a]">
                          외곽선
                        </button>
                        <button onClick={() => handleMergeZones('KEEP_ALL')} className="flex-1 px-2 py-1.5 bg-[#9e9e9e] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[#757575]">
                          점 유지
                        </button>
                      </div>
                    </div>
                  )}
                  {/* 단일 선택 액션 */}
                  {selectedZone && (
                    <>
                      <button onClick={() => { setEditingZoneName(selectedZone.name); setShowEditNameModal(true); }} className="px-2.5 py-1.5 bg-[#5f6368] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Edit3 size={12} /> 이름 수정
                      </button>
                      <button onClick={() => handleRotateZone(selectedZone.id, 15)} className="px-2.5 py-1.5 bg-[#607d8b] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <RotateCw size={12} /> +15°
                      </button>
                      <button onClick={() => handleRotateZone(selectedZone.id, -15)} className="px-2.5 py-1.5 bg-[#607d8b] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <RotateCw size={12} className="scale-x-[-1]" /> -15°
                      </button>
                      {selectedZone.type === 'PLANNED' && (
                        <button onClick={() => { setLinkTargetZoneId(selectedZone.id); setShowLinkModal(true); }} className="px-2.5 py-1.5 bg-[#34a853] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Link size={12} /> 호실 연결
                        </button>
                      )}
                      {selectedZone.type === 'LINKED' && (
                        <button onClick={() => handleUnlinkUnit(selectedZone.id)} className="px-2.5 py-1.5 bg-[#ea4335] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Unlink size={12} /> 연결 해제
                        </button>
                      )}
                      {/* 바닥 영역으로 지정 (FLOOR_BOUNDARY가 아닌 영역만) */}
                      {selectedZone.type !== 'FLOOR_BOUNDARY' && (
                        <button onClick={() => {
                          // 변경 전 히스토리 저장 (한 번만)
                          saveToHistory();
                          // 기존 바닥 영역이 있으면 PLANNED로 변경
                          if (floorBoundary) {
                            onSaveZone({ ...floorBoundary, type: 'PLANNED', updatedAt: new Date().toISOString() });
                          }
                          // 선택된 영역을 바닥 영역으로 설정
                          onSaveZone({
                            ...selectedZone,
                            type: 'FLOOR_BOUNDARY',
                            name: '바닥 영역',
                            color: '#9e9e9e',
                            opacity: 0.2,
                            estimatedArea: floorArea,
                            linkedUnitId: undefined,
                            updatedAt: new Date().toISOString()
                          });
                        }} className="px-2.5 py-1.5 bg-[#ff9800] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Layers size={12} /> 바닥 영역 지정
                        </button>
                      )}
                      {/* 모든 조닝 삭제 가능 (바닥 영역 포함) */}
                      <button onClick={() => {
                        if (selectedZone.type === 'FLOOR_BOUNDARY') {
                          if (confirm('바닥 영역을 삭제하면 추정 면적 계산이 불가능해집니다. 계속하시겠습니까?')) {
                            deleteZoneWithHistory(selectedZone.id);
                            setSelectedZoneId(null);
                          }
                        } else {
                          deleteZoneWithHistory(selectedZone.id);
                          setSelectedZoneId(null);
                        }
                      }} className="px-2.5 py-1.5 border border-[#ea4335] text-[#ea4335] text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Trash2 size={12} /> 삭제
                        </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 도면 관리 */}
            {currentPlan && (
              <div className="p-3 border-t border-[#dadce0]">
                <div className="flex gap-1.5">
                  <button onClick={() => setShowUploadModal(true)} className="flex-1 px-2.5 py-1.5 border border-[#dadce0] text-[#5f6368] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1">
                    <Upload size={12} /> 교체
                  </button>
                  <button onClick={() => {
                    if (confirm('도면을 삭제하면 모든 조닝도 삭제됩니다. 계속하시겠습니까?')) {
                      currentZones.forEach(z => onDeleteZone(z.id));
                      onDeleteFloorPlan(currentPlan.id);
                    }
                  }} className="px-2.5 py-1.5 border border-[#ea4335] text-[#ea4335] text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <Trash2 size={12} /> 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="font-black text-base mb-4">도면 업로드</h3>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#dadce0] rounded-xl p-8 text-center cursor-pointer hover:border-[#1a73e8] hover:bg-[#f8f9fa] transition-colors">
              <Upload size={32} className="mx-auto text-[#9aa0a6] mb-2" />
              <p className="text-sm text-[#5f6368]">클릭하여 파일 선택</p>
              <p className="text-[10px] text-[#9aa0a6] mt-1">PNG, JPG, PDF 지원</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-xs text-[#5f6368] hover:bg-[#f8f9fa] rounded-lg">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 도면 선택 모달 */}
      {showSelectExistingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-[500px] max-h-[70vh] shadow-2xl flex flex-col">
            <h3 className="font-black text-base mb-4">기존 도면 선택</h3>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {allFloorPlans.filter(p => p.id !== currentPlan?.id).map(plan => (
                  <div key={plan.id} onClick={() => handleSelectExisting(plan.id)} className="border border-[#dadce0] rounded-lg p-3 cursor-pointer hover:border-[#1a73e8] hover:bg-[#f8f9fa] transition-colors">
                    <img src={plan.fileData} alt={plan.fileName} className="w-full h-24 object-contain bg-[#f8f9fa] rounded mb-2" />
                    <p className="text-xs font-bold text-[#202124] truncate">{plan.fileName}</p>
                    <p className="text-[10px] text-[#5f6368]">{getFloorLabel(plan.floorNumber)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#dadce0]">
              <button onClick={() => setShowSelectExistingModal(false)} className="px-4 py-2 text-xs text-[#5f6368] hover:bg-[#f8f9fa] rounded-lg">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 호실 연결 모달 */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-96 max-h-[70vh] shadow-2xl flex flex-col">
            <h3 className="font-black text-base mb-4">호실 연결</h3>
            <div className="flex-1 overflow-y-auto">
              {units.filter(u => u.buildingId === building.id && u.floor === floorNumber).length === 0 ? (
                <p className="text-sm text-[#9aa0a6] text-center py-4">해당 층에 등록된 호실이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {units.filter(u => u.buildingId === building.id && u.floor === floorNumber).map(unit => {
                    const contract = leaseContracts.find(c => c.targetIds.includes(unit.id) && c.status === 'ACTIVE');
                    const tenant = contract ? stakeholders.find(s => contract.tenantIds.includes(s.id)) : null;
                    const isLinked = currentZones.some(z => z.linkedUnitId === unit.id);
                    return (
                      <button key={unit.id} onClick={() => handleLinkUnit(unit.id)} disabled={isLinked}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${isLinked ? 'border-[#dadce0] bg-[#f8f9fa] opacity-50 cursor-not-allowed' : 'border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#e8f0fe]'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{unit.unitNumber}호</span>
                          {isLinked && <span className="text-[9px] px-1.5 py-0.5 bg-[#9aa0a6] text-white rounded">연결됨</span>}
                        </div>
                        <p className="text-[10px] text-[#5f6368]">{unit.area.toFixed(1)}㎡ · {unit.usage}</p>
                        {tenant && <p className="text-[10px] text-[#1a73e8] mt-0.5">{tenant.name}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#dadce0]">
              <button onClick={() => { setShowLinkModal(false); setLinkTargetZoneId(null); }} className="px-4 py-2 text-xs text-[#5f6368] hover:bg-[#f8f9fa] rounded-lg">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="font-black text-base mb-4">구역 이름 수정</h3>
            <input type="text" value={editingZoneName} onChange={e => setEditingZoneName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#dadce0] rounded-lg mb-4" autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEditNameModal(false)} className="px-4 py-2 text-xs text-[#5f6368] hover:bg-[#f8f9fa] rounded-lg">취소</button>
              <button onClick={handleUpdateZoneName} className="px-4 py-2 text-xs bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0]">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanViewer;
