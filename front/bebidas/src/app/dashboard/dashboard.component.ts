import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Column, Line } from '@antv/g2plot';
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
  linechart!: Line;
  lineas: boolean = true;
  tipoBebida: string = 'Todas';
  marca: string = 'Todas';
  total: number = 0;
  cantidad: number = 0;
  pendingUpdates = new Set<string>();
  deleteId!: string;
  months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  salesByMonth: number[] = new Array(12).fill(0);
  countByMonth: number[] = new Array(12).fill(0);
  goalByMonth: number[] = new Array(12).fill(0);
  metaStatus: boolean[] = [];
  constructor(
    private auth: FirebaseAuthService,
    private router: Router,
    private bebidasService: BebidasService,
    private cd: ChangeDetectorRef,
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

  mostrarDataGeneral() {
    const sales = new Array(12).fill(0);
    const count = new Array(12).fill(0);
    const goal = new Array(12).fill(0);

    this.datos.forEach((item) => {
      const index = this.months.indexOf(item.month);
      if (index !== -1) {
        sales[index] += item.sales;
        count[index] += item.count;
        goal[index] += item.goal;
      }
    });

    this.salesByMonth = sales;
    this.countByMonth = count;
    this.goalByMonth = goal;
    this.metaStatus = this.salesByMonth.map((v, i) => v >= this.goalByMonth[i]);
  }

  cargarDatos() {
    this.filtros.type = this.mapTipo(this.tipoBebida);
    this.filtros.brand = this.marca !== 'Todas' ? this.marca : null;
    this.bebidasService.obtenerBebidas(this.filtros).subscribe((res) => {
      this.datos = res.data.bebidas.result;
      this.total = res.data.bebidas.total;
      this.cantidad = res.data.bebidas.cantidad;
      this.mostrarDataGeneral();
      this.evaluarTipoGrafico();
    });
  }

  evaluarTipoGrafico(): void {
    if (this.marca === 'Todas') {
      this.lineas = true;
      this.cd.detectChanges();
      this.crearGraficoLineas(this.datos);
    } else {
      this.lineas = false;
      this.cd.detectChanges();
      this.crearGrafico(this.datos);
    }
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
            x1: p.x - 60,
            y1: p.y,
            x2: p.x + 60,
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

  crearGraficoLineas(data: Bebida[]): void {
    if (this.linechart) this.linechart.destroy();

    const chartData = this.agruparPorMarcaYMes(data);

    this.linechart = new Line('lineasContainer', {
      data: chartData,
      xField: 'month',
      yField: 'sales',
      seriesField: 'brand',
      padding: 'auto',
      point: {
        size: 6,
        shape: 'circle',
      },
      legend: {
        position: 'top',
      },
      smooth: true,
      animation: {
        appear: {
          duration: 4500,
        },
      },
    });

    this.linechart.render();
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  mapTipo(tipo: string) {
    if (tipo === 'Aguas') return 'Agua';
    if (tipo === 'Gaseosas') return 'Gaseosa';
    return null;
  }
  getGoalStatus(i: number) {
    return this.metaStatus[i] ? 'row-success' : 'row-fail';
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
    this.lineas = true;
    const tipoEnum = this.mapTipo(tipo);

    this.cargarMarcasPorTipo(tipoEnum);

    this.cargarDatos();
  }

  onMarcaChange(marca: string) {
    this.marca = marca;
    this.lineas = false;
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
      if (acc.sales >= acc.goal) {
        d.succes = true;
      }
    });

    return Array.from(map.values());
  }
  agruparPorMes(data: any[]) {
    const map = new Map<string, any>();
    const ordenMes: any = {
      Enero: 1,
      Febrero: 2,
      Marzo: 3,
      Abril: 4,
      Mayo: 5,
      Junio: 6,
      Julio: 7,
      Agosto: 8,
      Septiembre: 9,
      Octubre: 10,
      Noviembre: 11,
      Diciembre: 12,
    };

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

    return Array.from(map.values()).sort(
      (a, b) => ordenMes[a.month] - ordenMes[b.month],
    );
  }

  agruparPorMarcaYMes(data: Bebida[]) {
    const meses = this.months;
    const marcas = [...new Set(data.map((d) => d.brand))];

    const resultado: any[] = [];

    marcas.forEach((brand) => {
      meses.forEach((month) => {
        const total = data
          .filter((d) => d.brand === brand && d.month === month)
          .reduce((sum, d) => sum + d.sales, 0);

        resultado.push({
          brand,
          month,
          sales: total,
        });
      });
    });

    return resultado;
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

  focusNext(event: KeyboardEvent, next: HTMLInputElement) {
    event.preventDefault();
    next.focus();
  }

  getRowClass(bebida: any) {
    return bebida.succes ? 'row-success' : 'row-fail';
  }
}
