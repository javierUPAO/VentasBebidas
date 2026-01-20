import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Column } from '@antv/g2plot';
import { FirebaseAuthService } from '../Guards/firebase-auth.service';
import { Router } from '@angular/router';
import { BebidasService } from '../services/bebidas.service';
import { UpdateRequest } from '../models/update';
import { Bebida } from '../models/bebida';
import { ToastService } from '../services/toast.service';
import { DualAxes } from '@antv/g2plot';
import { anonOperationNotAloneMessage } from 'graphql/validation/rules/LoneAnonymousOperation';
declare const bootstrap: any;
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  chart!: Column;
  tipoBebida: string = 'Todas';
  marca: string = 'Todas';
  total: number = 0;
  cantidad: number = 0;
  pendingUpdates = new Set<string>();
  deleteId!: string;
  modal!: any;
  once: boolean;
  constructor(
    private auth: FirebaseAuthService,
    private router: Router,
    private bebidasService: BebidasService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {}

  logout() {
    this.auth.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
  marcasDisponibles: string[] = [];

  filtros = {
    type: null,
    brand: null,
  };
  datos: Bebida[] = [];

  ngAfterViewInit(): void {
    this.onTipoChange('Todas');
    this.cargarDatos();
  }

  cargarDatos() {
    this.filtros.type = this.mapTipo(this.tipoBebida);
    this.filtros.brand = this.marca !== 'Todas' ? this.marca : null;
    this.bebidasService.obtenerBebidas(this.filtros).subscribe((res) => {
      this.datos = res.data.bebidas.result;
      console.log(this.datos);
      this.total = res.data.bebidas.total;
      this.cantidad = res.data.bebidas.cantidad;
      this.crearGrafico(this.datos);
    });
    this.once = true;
  }

  crearGrafico(data: Bebida[]): void {
    const hayMarca = this.filtros.brand !== null;

    if (this.chart) this.chart.destroy();

    const chartData = hayMarca
      ? this.agruparPorMes(data)
      : this.agruparPorMarca(data);

    const maxY =
      Math.max(...chartData.map((d) => Math.max(d.sales, d.goal))) * 1.15;
    const lineasMeta = data.map((d) => ({
      type: 'shape',
      top: true,
      render: (container, view, helpers) => {
        const { parsePosition } = helpers;
        const xValue = hayMarca ? d.month : d.brand;
        const p = parsePosition({
          [hayMarca ? 'month' : 'brand']: xValue,
          sales: d.goal,
        });

        if (!p || isNaN(p.x) || isNaN(p.y)) return;

        container.addShape('line', {
          attrs: {
            x1: p.x - 100,
            y1: p.y,
            x2: p.x + 100,
            y2: p.y,
            stroke: d.succes ? '#22c55e' : '#ef4444',
            lineWidth: 3,
          },
        });
      },
    }));

    const etiquetasMeta = data.map((d) => ({
      type: 'text',
      // Posición basada en los datos (Eje X, Eje Y)
      position: [hayMarca ? d.month : d.brand, d.goal],
      content: `Meta: ${d.goal}`,
      style: {
        textAlign: 'center',
        fill: '#000000',
        fontSize: 12,
        fontWeight: 'bold',
        rotate: Math.PI / 4,
      },
      offsetY: -12,
    }));
    this.chart = new Column('container', {
      data: chartData,
      xField: hayMarca ? 'month' : 'brand',
      yField: 'sales',
      seriesField: hayMarca ? 'month' : 'brand',
      padding: 'auto',
      yAxis: {
        max: maxY,
      },
      tooltip: {
        customContent: (title, items) => {
          if (!items?.length) return '';
          const d = items[0].data;
          return `
          <div>
            <b>${title}</b><br/>
            Ventas: ${d.sales}<br/>
            Meta: ${d.goal}
          </div>
        `;
        },
      },
      annotations: [...lineasMeta, ...etiquetasMeta] as any,
    });

    this.chart.render();
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  mapTipo(tipo: string) {
    if (tipo === 'Aguas') return 'Agua';
    if (tipo === 'Gaseosas') return 'Gaseosa';
    return null;
  }

  cargarMarcasPorTipo(tipo: string | null) {
    this.bebidasService
      .obtenerBebidas({
        type: tipo,
        brand: null,
      })
      .subscribe((res) => {
        const bebidas = res.data.bebidas.result as any[];

        this.marcasDisponibles = [
          ...new Set(bebidas.map((b) => b.brand as string)),
        ];
      });
  }

  onTipoChange(tipo: string) {
    this.tipoBebida = tipo;
    this.marca = 'Todas';

    const tipoEnum = this.mapTipo(tipo);

    this.cargarMarcasPorTipo(tipoEnum);

    this.cargarDatos();
  }

  onMarcaChange(marca: string) {
    this.marca = marca;
    this.cargarDatos();
  }

  agruparPorMarca(data: Bebida[]) {
    const map = new Map<string, any>();

    data.forEach((d) => {
      if (!map.has(d.brand)) {
        map.set(d.brand, {
          brand: d.brand,
          sales: 0,
          goal: d.goal,
          succes: d.succes,
        });
      }

      const acc = map.get(d.brand);
      acc.sales += d.sales;

      acc.goal = Math.max(acc.goal, d.goal);
    });

    return Array.from(map.values());
  }
  agruparPorMes(data: any[]) {
    const map = new Map<string, any>();

    data.forEach((b) => {
      if (!map.has(b.month)) {
        map.set(b.month, {
          month: b.month,
          sales: 0,
          goal: b.goal,
          succes: b.succes,
        });
      }

      const acc = map.get(b.month);
      acc.sales += b.sales;

      acc.goal = Math.max(acc.goal, b.goal);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  originalValues = new Map<string, any>();

  onFocus(bebida: any, field: string) {
    this.originalValues.set(`${bebida.id}-${field}`, bebida[field]);
  }
  onBlur(bebida: any, field: string) {
    this.checkAndUpdate(bebida, field);
  }

  onEnter(event: KeyboardEvent, bebida: any, field: string) {
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  checkAndUpdate(bebida: any, field: string) {
    const key = `${bebida.id}-${field}`;
    const original = this.originalValues.get(key);
    const current = bebida[field];
    console.log('key:' + key, 'original :' + original + 'current :' + current);
    const isSame =
      typeof original === 'number'
        ? Number(original) === Number(current)
        : original === current;
    if (current === null) return;
    if (isSame) return;

    if (this.pendingUpdates.has(key)) return;

    this.pendingUpdates.add(key);
    const input: UpdateRequest = {
      [field]: current,
    };
    this.bebidasService.actualizarBebida(bebida.id, input).subscribe({
      next: () => {
        this.cargarDatos();
        this.onTipoChange('Todas');
      },
      error: () => {
        bebida[field] = original;
      },
      complete: () => {
        this.pendingUpdates.delete(key);
        this.cargarDatos();
      },
    });
  }

  addRow(bebida: Bebida, index: number) {
    if (this.once === true) {
      const newRow: Bebida = {
        brand: bebida.brand,
        type: bebida.type,
        sales: undefined,
        count: undefined,
        month: '',
        isNew: true,
        mode: 'inline',
        goal: undefined,
      };
      this.datos.splice(index + 1, 0, newRow);
      this.once = false;
    }
  }

  addfirstRow() {
    const newRow: Bebida = {
      brand: '',
      type: '',
      sales: undefined,
      count: undefined,
      month: '',
      isNew: true,
      mode: 'first',
      goal: undefined,
    };

    this.datos = [newRow];
  }

  openDeleteModal(id: string) {
    this.deleteId = id;
    const modalEl = document.getElementById('deleteModal');
    this.modal = new bootstrap.Modal(modalEl);
    this.modal.show();
  }

  confirmDelete() {
    this.bebidasService.borrarBebida(this.deleteId).subscribe({
      next: (res: any) => {
        this.modal.hide();
        this.cargarDatos();
        this.onTipoChange('Todas');
        this.toast.show(res.data.deleteBebida.message, 'success');
      },
      error: (err) => {
        this.toast.show('Error al eliminar bebida', 'error');
      },
    });
  }

  checkCreate(bebida: Bebida) {
    if (
      bebida.sales == null ||
      bebida.count == null ||
      !bebida.month ||
      !bebida.brand ||
      !bebida.type ||
      bebida.goal == null
    ) {
      return;
    }

    if (!bebida.isNew) return;

    const input = {
      brand: bebida.brand,
      type: bebida.type,
      sales: bebida.sales,
      count: bebida.count,
      month: bebida.month,
      goal: bebida.goal,
    };

    this.bebidasService.crearBebida(input).subscribe({
      next: () => {
        bebida.isNew = false;
        this.cargarDatos();
        this.onTipoChange('Todas');
        this.once = true;
      },
      error: () => {
        console.error('Error al crear bebida');
      },
    });
  }

  focusNext(event: KeyboardEvent, next: HTMLInputElement) {
    event.preventDefault();
    next.focus();
  }

  onCreateEnter(event: KeyboardEvent, bebida: Bebida) {
    event.preventDefault();
    this.checkCreate(bebida);
  }

  onCancelCreate(bebida: Bebida, event?: KeyboardEvent) {
    event?.preventDefault();

    if (bebida.isNew) {
      this.datos = this.datos.filter((b) => b !== bebida);
      this.once = true;
    }
  }

  getRowClass(bebida: any) {
    return bebida.succes ? 'row-success' : 'row-fail';
  }
}
