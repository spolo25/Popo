'use client'

import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { Navbar, Container, Nav, Form, Button } from 'react-bootstrap';


interface Producto {
  id: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  imagen_url: string
}

interface ProductoCarrito extends Producto {
  cantidadSeleccionada: number
}

interface Venta {
  ventaId: string
  fecha: string
  hora: string
  producto: string
  cantidad: number
  precioUnitario: number
  pagoEfectivo: number
  pagoQR: number
  total: number
  regateo: number
}


interface VentasPageProps {
  fondoSrc: string
}

export default function VentasPage({ fondoSrc }: VentasPageProps) {
  const LIMITE = 20

const [page, setPage] = useState(1)
const [totalPaginas, setTotalPaginas] = useState(1)

  const [productos, setProductos] = useState<Producto[]>([])
  const [buscar, setBuscar] = useState('')
  const [modalProducto, setModalProducto] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState<string>('1')
const [efectivo, setEfectivo] = useState<string>('')
  const [vuelto, setVuelto] = useState<number>(0)
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([])
  const [modalFinal, setModalFinal] = useState(false)
  const [ventas, setVentas] = useState<Venta[]>([])

  const [modalVerificacion, setModalVerificacion] = useState(false)
  const [passwordVerificacion, setPasswordVerificacion] = useState('')
  const [errorVerificacion, setErrorVerificacion] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [usuario, setUsuario] = useState<string>('')
  const [regateo, setRegateo] = useState<string>('0')
  const [montoDepositado, setMontoDepositado] = useState<string>('')
  const [ultimaVenta, setUltimaVenta] = useState<{
  hora: string
  total: number
} | null>(null)




useEffect(() => {
  const ventaGuardada = localStorage.getItem('ultimaVenta')
  if (ventaGuardada) {
    setUltimaVenta(JSON.parse(ventaGuardada))
  }
}, [])

useEffect(() => {
  const obtenerUsuario = async () => {
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email

    if (email) {
      setUsuario(email.split('@')[0]) // 👈 solo antes del @
    }
  }

  obtenerUsuario()
}, [])


  // Cargar productos y ventas persistentes
 useEffect(() => {
  cargarProductos(1,buscar)

    const ventasGuardadas = localStorage.getItem('ventas')
    if (ventasGuardadas) setVentas(JSON.parse(ventasGuardadas))
  }, [buscar])

  // Guardar ventas en localStorage
  useEffect(() => {
    localStorage.setItem('ventas', JSON.stringify(ventas))
  }, [ventas])

  // Advertencia al cerrar pestaña o retroceder si hay ventas sin cerrar turno
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ventas.length > 0) {
        e.preventDefault()
        e.returnValue = '' // Mensaje genérico, los navegadores modernos no muestran texto personalizado
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [ventas])
  const cargarProductos = async (pagina = 1, texto = '') => {
  const desde = (pagina - 1) * LIMITE
  const hasta = desde + LIMITE - 1

  let query = supabase
    .from('productos')
    .select('*', { count: 'exact' })

  if (texto.trim() !== '') {
    query = query.ilike('nombre', `%${texto}%`)
  }

  const { data, error, count } = await query.range(desde, hasta)

  if (error) {
    console.error(error)
    return
  }

  setProductos(data || [])
  setPage(pagina)

  if (count) {
    setTotalPaginas(Math.ceil(count / LIMITE))
  }
}



  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  )

  const logout = async () => {
    if (ventas.length > 0) {
      alert("Debes cerrar el turno y generar el reporte antes de cerrar sesión.")
      return
    }
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const openModal = (producto: Producto) => {
    setModalProducto(producto)
    setCantidad('1')
    setEfectivo('')
    setVuelto(0)
  }

  const agregarAlCarrito = () => {
  if (!modalProducto) return

  const cant = Number(cantidad) || 1

  const existe = carrito.find(p => p.id === modalProducto.id)

  if (existe) {
    setCarrito(carrito.map(p =>
      p.id === modalProducto.id
        ? { ...p, cantidadSeleccionada: p.cantidadSeleccionada + cant }
        : p
    ))
  } else {
    setCarrito([...carrito, { ...modalProducto, cantidadSeleccionada: cant }])
  }

  setSidebarOpen(true)
  setModalProducto(null)
}


const calcularTotalCompra = () => {
  const subtotal = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidadSeleccionada,
    0
  )

  const descuento = Number(regateo) || 0

  return Math.max(0, subtotal - descuento)
}

 const handleEfectivoChange = (valor: string) => {
  setEfectivo(valor)

  const total = calcularTotalCompra()
  const monto = Number(valor)

  // Permitir borrar el input
  if (valor === '' || isNaN(monto)) {
    setVuelto(0)
    return
  }

  if (monto >= total) {
    setVuelto(monto - total)
  } else {
    setVuelto(0)
  }
}



  const finalizarCompra = () => {
  const descuento = Number(regateo) || 0

  const subtotal = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidadSeleccionada,
    0
  )

  const total = Math.max(0, subtotal - descuento)
  const efectivoNum = Number(efectivo) || 0
  const pagoQR = Math.max(0, total - efectivoNum)

  const fecha = new Date()
  const fechaStr = fecha.toLocaleDateString()
  const horaStr = fecha.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const ventaId = `${Date.now()}`

  const nuevasVentas: Venta[] = carrito.map(item => {
    const totalItem = item.precio * item.cantidadSeleccionada
    const proporcion = totalItem / subtotal

    return {
      ventaId,
      fecha: fechaStr,
      hora: horaStr,
      producto: item.nombre,
      cantidad: item.cantidadSeleccionada,
      precioUnitario: item.precio,
      pagoEfectivo:
        Math.round(Math.min(efectivoNum, total) * proporcion * 100) / 100,
      pagoQR: Math.round(pagoQR * proporcion * 100) / 100,
      total: totalItem,
      regateo: descuento
    }
  })

  setVentas([...ventas, ...nuevasVentas])

  // ✅ GUARDAR ÚLTIMA VENTA
  const ultima = { hora: horaStr, total }
  setUltimaVenta(ultima)
  localStorage.setItem('ultimaVenta', JSON.stringify(ultima))

  alert('Compra finalizada')

  // 🧹 LIMPIEZA
  setCarrito([])
  setModalFinal(false)
  setEfectivo('')
  setVuelto(0)
  setRegateo('0')
}






  const exportarExcel = () => {
  if (ventas.length === 0) return

  const wb = XLSX.utils.book_new()
  const wsData: any[] = []

// RESUMEN DE PRODUCTOS VENDIDOS
const resumenProductos: Record<string, number> = {}

ventas.forEach(v => {
  if (!resumenProductos[v.producto]) {
    resumenProductos[v.producto] = 0
  }
  resumenProductos[v.producto] += v.cantidad
})

wsData.push(
  { Producto: 'RESUMEN DE PRODUCTOS VENDIDOS' },
  {}
)

wsData.push({
  Producto: 'Producto',
  Cantidad: 'Cantidad Total Vendida'
})

Object.entries(resumenProductos).forEach(([producto, cantidad]) => {
  wsData.push({
    Producto: producto,
    Cantidad: cantidad
  })
})

wsData.push({}, {})


  // 🔴 RESUMEN GENERAL DEL TURNO
  const totalEfectivoTurno = ventas.reduce(
    (acc, v) => acc + v.pagoEfectivo,
    0
  )

  const totalQRTurno = ventas.reduce(
    (acc, v) => acc + v.pagoQR,
    0
  )

  const totalTurno = totalEfectivoTurno + totalQRTurno

  wsData.push(
    { Producto: 'RESUMEN GENERAL DEL TURNO' },
    {},
    { Producto: 'TOTAL EFECTIVO TURNO', Total: totalEfectivoTurno },
    { Producto: 'TOTAL QR TURNO', Total: totalQRTurno },
    { Producto: 'TOTAL VENDIDO TURNO', Total: totalTurno },
    {},
    {}
  )

  // 🔴 AGRUPAR VENTAS POR ventaId
  const ventasAgrupadas: Record<string, Venta[]> = {}

  ventas.forEach(v => {
    if (!ventasAgrupadas[v.ventaId]) {
      ventasAgrupadas[v.ventaId] = []
    }
    ventasAgrupadas[v.ventaId].push(v)
  })

  let nro = 1

  Object.values(ventasAgrupadas).forEach(items => {
    wsData.push(
  { Producto: `VENTA ${nro}` },
  { Producto: `Fecha: ${items[0].fecha}`, Cantidad: `Hora: ${items[0].hora}` },
  { Producto: 'REGATEO APLICADO', Total: items[0].regateo },
  {}
)


    wsData.push({
      Producto: 'Producto',
      Cantidad: 'Cantidad',
      'Precio Unitario': 'Precio Unitario',
      'Pago Efectivo': 'Pago Efectivo',
      'Pago QR': 'Pago QR',
      Total: 'Total'
    })

    let totalEfe = 0
    let totalQR = 0

    items.forEach(v => {
      totalEfe += v.pagoEfectivo
      totalQR += v.pagoQR

      wsData.push({
        Producto: v.producto,
        Cantidad: v.cantidad,
        'Precio Unitario': v.precioUnitario,
        'Pago Efectivo': v.pagoEfectivo,
        'Pago QR': v.pagoQR,
        Total: v.total
      })
    })

    wsData.push(
      {},
      { Producto: 'TOTAL EFECTIVO', 'Pago Efectivo': totalEfe },
      { Producto: 'TOTAL QR', 'Pago QR': totalQR },
      {},
      {}
    )

    nro++
  })

  const ws = XLSX.utils.json_to_sheet(wsData, { skipHeader: true })
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout]), 'ventas_por_turno.xlsx')
}





  const validarPasswordYEnviarCorreo = async () => {
    
  setErrorVerificacion('')

  // 1️⃣ Usuario actual
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email

  if (!email) {
    setErrorVerificacion('No se encontró el usuario.')
    return
  }

  // 2️⃣ Validar contraseña
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordVerificacion
  })

  if (error) {
    setErrorVerificacion('Contraseña incorrecta.')
    return
  }

  // 3️⃣ Validar ventas
  if (ventas.length === 0) {
    alert('No hay ventas para cerrar el turno.')
    setModalVerificacion(false)
    return
  }

  // 4️⃣ Crear Excel AGRUPADO POR VENTA
  const wb = XLSX.utils.book_new()
  const wsData: any[] = []
  // ===============================
// RESUMEN DE PRODUCTOS VENDIDOS
// ===============================
const resumenProductos: Record<string, number> = {}

ventas.forEach(v => {
  if (!resumenProductos[v.producto]) {
    resumenProductos[v.producto] = 0
  }
  resumenProductos[v.producto] += v.cantidad
})


wsData.push(
  { Producto: 'RESUMEN DE PRODUCTOS VENDIDOS' },
  {}
)

wsData.push({
  Producto: 'Producto',
  Cantidad: 'Cantidad Total Vendida'
})

Object.entries(resumenProductos).forEach(([producto, cantidad]) => {
  wsData.push({
    Producto: producto,
    Cantidad: cantidad
  })
})

wsData.push({}, {})

  const totalEfectivoTurno = ventas.reduce((acc, v) => acc + v.pagoEfectivo, 0)
const totalQRTurno = ventas.reduce((acc, v) => acc + v.pagoQR, 0)
const totalTurno = totalEfectivoTurno + totalQRTurno
const depositado = Number(montoDepositado) || 0
const diferencia = depositado - totalEfectivoTurno


wsData.push(
  { Producto: 'RESUMEN GENERAL DEL TURNO' },
  {},
  { Producto: 'TOTAL EFECTIVO TURNO', Total: totalEfectivoTurno },
  { Producto: 'TOTAL QR TURNO', Total: totalQRTurno },
  { Producto: 'TOTAL VENDIDO TURNO', Total: totalTurno },
  {},
  {}
)
// ===============================
// CIERRE DE CAJA
// ===============================
wsData.push(
  {},
  { Producto: 'CIERRE DE CAJA' },
  {},
  { Producto: 'EFECTIVO ESPERADO', Total: totalEfectivoTurno },
  { Producto: 'EFECTIVO DEPOSITADO', Total: depositado },
  {
    Producto:
      diferencia === 0
        ? 'CUADRE PERFECTO'
        : diferencia > 0
        ? 'SOBRANTE'
        : 'FALTANTE',
    Total: Math.abs(diferencia)
  },
  {},
  {}
)



  const ventasAgrupadas: Record<string, Venta[]> = {}

  ventas.forEach(v => {
    if (!ventasAgrupadas[v.ventaId]) {
      ventasAgrupadas[v.ventaId] = []
    }
    ventasAgrupadas[v.ventaId].push(v)
  })

  let nroVenta = 1

  Object.values(ventasAgrupadas).forEach(items => {
    wsData.push(
  { Producto: `VENTA ${nroVenta}` },
  { Producto: `Fecha: ${items[0].fecha}`, Cantidad: `Hora: ${items[0].hora}` },
  { Producto: 'REGATEO APLICADO', Total: items[0].regateo },
  {}
)


    wsData.push({
      Producto: 'Producto',
      Cantidad: 'Cantidad',
      'Precio Unitario': 'Precio Unitario',
      'Pago Efectivo': 'Pago Efectivo',
      'Pago QR': 'Pago QR',
      Total: 'Total'
    })

    let totalEfectivo = 0
    let totalQR = 0

    items.forEach(v => {
      totalEfectivo += v.pagoEfectivo
      totalQR += v.pagoQR

      wsData.push({
        Producto: v.producto,
        Cantidad: v.cantidad,
        'Precio Unitario': v.precioUnitario,
        'Pago Efectivo': v.pagoEfectivo,
        'Pago QR': v.pagoQR,
        Total: v.total
      })
    })

    wsData.push(
      {},
      { Producto: 'TOTAL EFECTIVO', 'Pago Efectivo': totalEfectivo },
      { Producto: 'TOTAL QR', 'Pago QR': totalQR },
      {},
      {}
    )

    nroVenta++
  })
  

  const ws = XLSX.utils.json_to_sheet(wsData, { skipHeader: true })
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  //  Descarga automática
  saveAs(
    blob,
    `cierre_turno_${new Date().toLocaleDateString().replaceAll('/', '-')}.xlsx`
  )

  //  Enviar correo
  const formData = new FormData()
  formData.append('file', blob, 'cierre_turno.xlsx')
  formData.append('closedBy', email)

  const resp = await fetch('/api/send-turno-email', {
    method: 'POST',
    body: formData
  })

  if (!resp.ok) {
    alert('Error enviando el correo del cierre.')
    return
  }

  alert('✅ Turno cerrado, Excel descargado y correo enviado.')
  setVentas([])
  localStorage.removeItem('ventas')
  setUltimaVenta(null)
  localStorage.removeItem('ultimaVenta')
  setPasswordVerificacion('')
  setModalVerificacion(false)

}
const eliminarDelCarrito = (id: number) => {
  setCarrito(carrito.filter(item => item.id !== id))
}



  return (
    <div
      className="container-fluid py-4 position-relative"
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${fondoSrc || "/images/trago.jpeg"})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay oscuro */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 0
        }}
      ></div>

      {/* Contenido */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
<Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="w-100 shadow-sm py-3">
  <Container fluid className="d-flex align-items-center px-3">

    {/* Logo */}
    <Navbar.Brand href="#" className="fw-bold text-warning me-10 flex-shrink-0" style={{ fontSize: '1.3rem' }}>
      Licorería Popo
    </Navbar.Brand>
    <span className="text-white fw-semibold me-4">Bienvenido {usuario}</span>
    {/* Contenedor para buscador + toggle en línea */}
    <div className="d-flex flex-grow-1 align-items-center">
      {/* Buscador */}
      <Form className="flex-grow-1 me-2">
        <Form.Control
          type="text"
          placeholder="Buscar producto..."
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          className="rounded-pill shadow-sm"
        />
      </Form>


      {ultimaVenta && (
  <div
    className="mx-2 ps-3 px-3 py-1 rounded-pill fw-bold shadow-sm"

    style={{
      backgroundColor: '#ffc107',
      fontSize: '0.85rem',
      whiteSpace: 'nowrap'
    }}
  >
     Última venta {ultimaVenta.hora} — Bs {ultimaVenta.total.toFixed(2)}
  </div>
)}


      {/* Toggle del collapse */}
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
    </div>

    {/* Collapse */}
    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end mt-2 mt-lg-0">
      <div className="d-flex flex-column flex-lg-row align-items-start align-lg-center gap-2">
        
        <Button 
          variant="warning" 
          className="fw-bold shadow-sm"
          onClick={() => setModalVerificacion(true)}
        >
           Cerrar turno
        </Button>
        <Button 
          variant="outline-light" 
          className="fw-bold shadow-sm"
          onClick={logout}
        >
           Cerrar sesión
        </Button>
      </div>
    </Navbar.Collapse>

  </Container>
</Navbar>


{/* ESPACIO DE SEGURIDAD */}
<div style={{ height: '80px' }}></div>

        {/* Productos */}
        <div className="row g-3 mb-4">
          {productosFiltrados.map(p => (
            <div key={p.id} className="col-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <img
                src={p.imagen_url || '/default-product.png'}
                alt={p.nombre}
                style={{
                height: '180px',
                objectFit: 'cover'
                }}
                className="card-img-top"
                />

                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{p.nombre}</h5>
                  <p className="card-text flex-grow-1">{p.descripcion}</p>
                  <p className="mb-1"><strong>Precio:</strong> Bs {p.precio}</p>
                  <p className="mb-2"><strong>Stock:</strong> {p.stock}</p>
                  <button
                    className={`btn ${p.stock === 0 ? 'btn-secondary' : 'btn-warning'} mt-auto`}
                    disabled={p.stock === 0}
                    onClick={() => openModal(p)}
                  >
                    {p.stock === 0 ? 'AGOTADO' : 'SELECCIONAR'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mb-5">
 <div className="d-flex justify-content-center gap-2 my-4 flex-wrap">
  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
    <button
      key={num}
      className={`btn ${
        page === num ? 'btn-warning' : 'btn-outline-light'
      }`}
      onClick={() => cargarProductos(num, buscar)}
    >
      {num}
    </button>
  ))}
</div>

</div>



        
        {/* Modales */}
        {/* Modal verificación */}
        {modalVerificacion && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Verificar contraseña</h5>
                  <button type="button" className="btn-close" onClick={() => setModalVerificacion(false)}></button>
                </div>
                <div className="modal-body">
                  <input
                    type="password"
                    className="form-control mb-2"
                    placeholder="Ingresa tu contraseña"
                    value={passwordVerificacion}
                    onChange={e => setPasswordVerificacion(e.target.value)}
                  />
                  <input
                  type="number"
                  className="form-control mb-2"
                  placeholder="Monto depositado en caja (Bs)"
                  value={montoDepositado}
                  onChange={e => setMontoDepositado(e.target.value)}
                  />

                  {errorVerificacion && <p className="text-danger">{errorVerificacion}</p>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalVerificacion(false)}>Cancelar</button>
                  <button className="btn btn-success" onClick={validarPasswordYEnviarCorreo}>Confirmar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal producto */}
        {modalProducto && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{modalProducto.nombre}</h5>
                  <button type="button" className="btn-close" onClick={() => setModalProducto(null)}></button>
                </div>
                <div className="modal-body text-center">
                  <img src={modalProducto.imagen_url || '/default-product.png'} alt={modalProducto.nombre} className="img-fluid mb-3" />
                  <p><strong>Precio:</strong> Bs {modalProducto.precio}</p>
                  <input
                  type="number"
                  className="form-control mb-3"
                  min={1}
                  max={modalProducto.stock}
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder='Cantidad a vender'
                  />

                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalProducto(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={agregarAlCarrito}>Agregar al carrito</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal final compra */}
{modalFinal && (
  <div className="modal show d-block" tabIndex={-1}>
    <div className="modal-dialog modal-dialog-centered modal-lg">
      <div className="modal-content shadow-lg">
        
        {/* Header */}
        <div className="modal-header bg-dark text-white">
          <h5 className="modal-title"> Finalizar compra</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={() => setModalFinal(false)}
          ></button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Productos */}
          <ul className="list-group mb-3">
            {carrito.map(item => (
  <li
    key={item.id}
    className="list-group-item bg-dark text-white d-flex justify-content-between align-items-center"
  >
    <div>
      <strong>{item.nombre}</strong>
      <div className="small">
        Bs {item.precio} x {item.cantidadSeleccionada}
      </div>
    </div>

    <div className="d-flex align-items-center gap-2">
      <span>
        Bs {item.precio * item.cantidadSeleccionada}
      </span>

      <button
        className="btn btn-sm btn-danger"
        onClick={() => eliminarDelCarrito(item.id)}
        title="Eliminar producto"
      >
        ❌
      </button>
    </div>
  </li>
))}

          </ul>

          {/* Totales */}
          <div className="border rounded p-3 mb-3 bg-light">
            <p className="mb-1">
              <strong>Total a pagar:</strong> Bs {calcularTotalCompra().toFixed(1)}
            </p>
            {Number(regateo) === 5 && (
  <small className="text-danger">
    Máximo descuento permitido: 5 Bs
  </small>
)}

            <label className="form-label mt-2">Descuento / Regateo (Bs)</label>
            <input
            type="number"
            className="form-control"
            min={0}
            value={regateo}
          onChange={e => {
  const valor = Number(e.target.value) || 0

  const subtotal = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidadSeleccionada,
    0
  )

  const regateoFinal = Math.min(valor, 5, subtotal)

  setRegateo(regateoFinal.toString())
}}
            placeholder="Monto descontado al cliente"
            />
{Number(regateo) > 0 && (
  <p className="text-danger mt-1">
    - Bs {Number(regateo)}
  </p>
)}


            <label className="form-label mt-2">Pago en efectivo</label>
            <input
  type="number"
  className="form-control"
  min={0}
  value={efectivo}
  onChange={e => handleEfectivoChange(e.target.value)}
  placeholder="Colocar en caso se pague en efectivo"
/>


            <div className="mt-2">
              <p className="mb-1">
                 Pago en QR: <strong> Bs {Math.max(0, calcularTotalCompra() - (Number(efectivo) || 0))}</strong>
              </p>
              <p className={`mb-0 fw-bold ${vuelto > 0 ? 'text-success' : ''}`}>
                 Vuelto: Bs {vuelto.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setModalFinal(false)}
          >
            Cancelar
          </button>
          <button
            className="btn btn-success px-4"
            onClick={finalizarCompra}
          >
            Confirmar pago
          </button>
        </div>

      </div>
    </div>
  </div>
)}


      </div>
      <button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  style={{
    position: 'fixed',
    top: '50%',
    right: sidebarOpen ? '320px' : '0',
    transform: 'translateY(-50%)',
    zIndex: 999,
    borderRadius: '8px 0 0 8px'
  }}
  className="btn btn-warning"
>
  🧾
</button>
{/* Sidebar carrito */}
<div
  style={{
    position: 'fixed',
    top: 0,
    right: sidebarOpen ? 0 : '-320px',
    width: '320px',
    height: '100vh',
    backgroundColor: '#111',
    color: '#fff',
    padding: '15px',
    transition: 'right 0.3s ease',
    zIndex: 998,
    overflowY: 'auto'
  }}
>
  <h5 className="mb-3">🛒 Productos seleccionados</h5>

  {carrito.length === 0 ? (
    <p className="text-muted">No hay productos</p>
  ) : (
    <ul className="list-group list-group-flush">
      {carrito.map(item => (
        <li
          key={item.id}
          className="list-group-item bg-dark text-white d-flex justify-content-between align-items-center"
        >
          <div>
            <strong>{item.nombre}</strong>
            <div className="small">
              Bs {item.precio} x {item.cantidadSeleccionada}
            </div>
          </div>
          <span>
            Bs {item.precio * item.cantidadSeleccionada}
          </span>
        </li>
      ))}
    </ul>
  )}

  <hr />

  <p>
    <strong>Total:</strong> Bs {calcularTotalCompra()}
  </p>

  <button
    className="btn btn-success w-100"
    onClick={() => {
      setModalFinal(true)
      setSidebarOpen(false)
    }}
    disabled={carrito.length === 0}
  >
    Finalizar compra
  </button>
</div>

    </div>
  )
}
