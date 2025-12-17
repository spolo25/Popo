'use client'

import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'

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
}


interface VentasPageProps {
  fondoSrc: string
}

export default function VentasPage({ fondoSrc }: VentasPageProps) {
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
    const fetchProductos = async () => {
      const { data, error } = await supabase.from('productos').select('*')
      if (!error) setProductos(data as Producto[])
    }
    fetchProductos()

    const ventasGuardadas = localStorage.getItem('ventas')
    if (ventasGuardadas) setVentas(JSON.parse(ventasGuardadas))
  }, [])

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


  const calcularTotalCompra = () => carrito.reduce((acc, item) => acc + item.precio * item.cantidadSeleccionada, 0)

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
  const total = calcularTotalCompra()
  const efectivoNum = Number(efectivo) || 0
  const pagoQR = Math.max(0, total - efectivoNum)

  const fecha = new Date()
  const fechaStr = fecha.toLocaleDateString()
  const horaStr = fecha.toLocaleTimeString()

  const ventaId = `${Date.now()}`

  const nuevasVentas: Venta[] = carrito.map(item => {
    const totalItem = item.precio * item.cantidadSeleccionada
    const proporcion = totalItem / total

    return {
      ventaId,
      fecha: fechaStr,
      hora: horaStr,
      producto: item.nombre,
      cantidad: item.cantidadSeleccionada,
      precioUnitario: item.precio,
      pagoEfectivo: Math.round(Math.min(efectivoNum, total) * proporcion * 100) / 100,
      pagoQR: Math.round(pagoQR * proporcion * 100) / 100,
      total: totalItem
    }
  })

  setVentas([...ventas, ...nuevasVentas])

  alert('✅ Compra finalizada')

  setCarrito([])
  setModalFinal(false)
  setEfectivo('')
  setVuelto(0)
}




  const exportarExcel = () => {
  if (ventas.length === 0) return

  const wb = XLSX.utils.book_new()
  const wsData: any[] = []

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
  const totalEfectivoTurno = ventas.reduce((acc, v) => acc + v.pagoEfectivo, 0)
const totalQRTurno = ventas.reduce((acc, v) => acc + v.pagoQR, 0)
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

  // ⬇️ Descarga automática
  saveAs(
    blob,
    `cierre_turno_${new Date().toLocaleDateString().replaceAll('/', '-')}.xlsx`
  )

  // 5️⃣ Enviar correo
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

  // 6️⃣ Cierre definitivo
  alert('✅ Turno cerrado, Excel descargado y correo enviado.')

  setVentas([])
  localStorage.removeItem('ventas')
  setPasswordVerificacion('')
  setModalVerificacion(false)
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
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark rounded mb-4 px-3">
          <a className="navbar-brand fw-bold" href="#">Licorería Popo</a>
          <div className="collapse navbar-collapse">
            <form className="d-flex ms-auto" onSubmit={e => e.preventDefault()}>
              <input
                className="form-control me-2"
                type="search"
                placeholder="Buscar producto..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </form>
            <span className="text-white me-3">
            <strong> Bienvenido {usuario}</strong>
            </span>
            <button className="btn btn-outline-warning ms-2" onClick={logout}>Cerrar sesión</button>
          </div>
        </nav>

        {/* Productos */}
        <div className="row g-3 mb-4">
          {productosFiltrados.map(p => (
            <div key={p.id} className="col-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <img src={p.imagen_url || '/default-product.png'} className="card-img-top" alt={p.nombre} />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{p.nombre}</h5>
                  <p className="card-text flex-grow-1">{p.descripcion}</p>
                  <p className="mb-1"><strong>Precio:</strong> S/ {p.precio}</p>
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


        {/* Cerrar turno */}
        <button className="btn btn-danger mb-5" onClick={() => setModalVerificacion(true)}>Cerrar turno</button>

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
                  <p><strong>Precio:</strong> S/ {modalProducto.precio}</p>
                  <input
  type="number"
  className="form-control mb-3"
  min={1}
  max={modalProducto.stock}
  value={cantidad}
  onChange={e => setCantidad(e.target.value)}
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
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="text-muted small">
                    {item.cantidadSeleccionada} × S/ {item.precio}
                  </div>
                </div>
                <span className="fw-bold">
                  S/ {item.precio * item.cantidadSeleccionada}
                </span>
              </li>
            ))}
          </ul>

          {/* Totales */}
          <div className="border rounded p-3 mb-3 bg-light">
            <p className="mb-1">
              <strong>Total a pagar:</strong> S/ {calcularTotalCompra()}
            </p>

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
                 Pago en QR: <strong> S/ {Math.max(0, calcularTotalCompra() - (Number(efectivo) || 0))}</strong>
              </p>
              <p className={`mb-0 fw-bold ${vuelto > 0 ? 'text-success' : ''}`}>
                 Vuelto: S/ {vuelto}
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
              S/ {item.precio} x {item.cantidadSeleccionada}
            </div>
          </div>
          <span>
            S/ {item.precio * item.cantidadSeleccionada}
          </span>
        </li>
      ))}
    </ul>
  )}

  <hr />

  <p>
    <strong>Total:</strong> S/ {calcularTotalCompra()}
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
