import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2'; 
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, TextField, Container, Grid, IconButton, Typography,
  Card, CardContent, CssBaseline, Box, MenuItem, Select, InputLabel, 
  FormControl, Checkbox, FormControlLabel, List, ListItem, ListItemButton, 
  ListItemIcon, ListItemText, Divider, Switch
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  Delete, Edit, Save, Terminal, DataObject, Settings, Storage, 
  KeyboardArrowRight, PlaylistAdd, FactCheck 
} from '@mui/icons-material';

// --- TEMA HACKER (Fondo Plomo Tenue Forzado) ---
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00ff00' },
    background: { default: '#b0b0b0', paper: '#1a1a1a' },
    text: { primary: '#00ff00', secondary: '#00cc00' },
  },
  typography: { fontFamily: '"Consolas", monospace', allVariants: { color: '#00ff00' } },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#b0b0b0', margin: 0, padding: 0 }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#050505',
          '& fieldset': { borderColor: '#333' },
          '&:hover fieldset': { borderColor: '#00ff00' },
          '&.Mui-focused fieldset': { borderColor: '#00ff00' },
          '& input': { textAlign: 'center' }
        }
      }
    },
    MuiButton: { styleOverrides: { root: { border: '1px solid #00ff00', borderRadius: 0, fontWeight: 'bold' } } },
    MuiTableCell: { styleOverrides: { root: { textAlign: 'center', borderBottom: '1px solid #333' } } },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { color: '#555', '&.Mui-checked': { color: '#00ff00' } },
        track: { backgroundColor: '#333', '&.Mui-checked': { backgroundColor: '#005500' } }
      }
    }
  }
});

function App() {
  // --- ESTADOS PRINCIPALES ---
  const [esquemas, setEsquemas] = useState([]); 
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null); 
  const [mostrarCreador, setMostrarCreador] = useState(false); 

  const [datos, setDatos] = useState([]);
  const [form, setForm] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Nuevo estado para la plantilla de carga JSON independiente
  const [jsonInputCarga, setJsonInputCarga] = useState(""); 

  // --- ESTADOS DEL CONSTRUCTOR (RECUPERADOS ÍNTEGRAMENTE) ---
  const [nuevoSistemaNombre, setNuevoSistemaNombre] = useState("");
  const [idAutomatico, setIdAutomatico] = useState(true); 
  const [nuevosCampos, setNuevosCampos] = useState([]);
  
  const [campoTemporal, setCampoTemporal] = useState({ 
      label: "", 
      type: "text", 
      maxLength: "",  
      options: "",    
      isInteger: false,
      numLength: "", 
      decimals: "2",
      // NUEVOS CAMPOS PARA CÁLCULOS
      calculationType: "",  // 'multiply', 'age', 'license_status'
      field1: "",           // Campo 1 para multiplicar (ej: precio)
      field2: "",           // Campo 2 para multiplicar (ej: cantidad)
      sourceField: ""       // Campo fuente para edad o licencia
  });

  // CARGAR AL INICIO (PERSISTENCIA SQLITE)
  useEffect(() => {
    fetch('http://localhost:8000/api/schemas/')
      .then(res => res.json())
      .then(setEsquemas);
  }, []);

  // CARGAR DATOS Y GENERAR PLANTILLA JSON
  useEffect(() => {
    if (negocioSeleccionado) {
      fetchDatos(negocioSeleccionado.nombre);
      setForm({});
      setModoEdicion(false);
      
      const estructura = {};
      negocioSeleccionado.campos.forEach(c => {
        // Excluir ID si es automático
        if (c.key === 'id' && negocioSeleccionado.config?.idAutomatico) return;
        
        // Excluir campos calculados automáticamente
        if (c.type === 'calculated' || c.type === 'age' || c.type === 'license_status') return;
        
        // Agregar el campo a la plantilla
        if (c.type === 'number' && !c.isInteger) {
          estructura[c.key] = "0.00";
        } else if (c.type === 'number') {
          estructura[c.key] = 0;
        } else {
          estructura[c.key] = "...";
        }
      });
      setJsonInputCarga(JSON.stringify(estructura, null, 2));
    }
  }, [negocioSeleccionado]);

  const fetchDatos = (nombreNegocio) => {
    fetch(`http://localhost:8000/api/data/?negocio=${nombreNegocio}`)
      .then(res => res.json())
      .then(setDatos);
  };

  // --- CÁLCULO AUTOMÁTICO DE CAMPOS CALCULADOS (CORREGIDO) ---
  useEffect(() => {
    if (!negocioSeleccionado || Object.keys(form).length === 0) return;
    
    const calcularCamposAutomaticos = () => {
      const nuevoForm = { ...form };
      let huboChangios = false;

      negocioSeleccionado.campos.forEach(campo => {
        // 1. CAMPO CALCULADO (Multiplicación)
        if (campo.type === 'calculated' && campo.field1 && campo.field2) {
          const val1 = parseFloat(form[campo.field1]) || 0;
          const val2 = parseFloat(form[campo.field2]) || 0;
          const resultado = (val1 * val2).toFixed(2);
          
          // Solo actualizar si el valor es diferente
          if (String(nuevoForm[campo.key]) !== String(resultado)) {
            nuevoForm[campo.key] = resultado;
            huboChangios = true;
          }
        }

        // 2. EDAD AUTOMÁTICA
        if (campo.type === 'age' && campo.sourceField && form[campo.sourceField]) {
          try {
            const fechaNacimiento = new Date(form[campo.sourceField]);
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
            const mesActual = hoy.getMonth();
            const mesNacimiento = fechaNacimiento.getMonth();
            
            if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fechaNacimiento.getDate())) {
              edad--;
            }
            
            // Solo actualizar si es válido y diferente
            if (!isNaN(edad) && edad >= 0 && String(nuevoForm[campo.key]) !== String(edad)) {
              nuevoForm[campo.key] = edad;
              huboChangios = true;
            }
          } catch (e) {
            // Si hay error en la fecha, no hacer nada
          }
        }

        // 3. ESTADO DE LICENCIA
        if (campo.type === 'license_status' && campo.sourceField && form[campo.sourceField]) {
          try {
            const fechaVencimiento = new Date(form[campo.sourceField]);
            const hoy = new Date();
            
            // Comparar solo las fechas sin horas
            hoy.setHours(0, 0, 0, 0);
            fechaVencimiento.setHours(0, 0, 0, 0);
            
            const estado = fechaVencimiento >= hoy ? 'VIGENTE' : 'VENCIDA';
            
            if (nuevoForm[campo.key] !== estado) {
              nuevoForm[campo.key] = estado;
              huboChangios = true;
            }
          } catch (e) {
            // Si hay error en la fecha, no hacer nada
          }
        }
      });

      if (huboChangios) {
        setForm(nuevoForm);
      }
    };

    calcularCamposAutomaticos();
  }, [
    form.fecha_nacimiento, 
    form.fecha_vencimiento, 
    form.precio, 
    form.cantidad,
    form.precio_unitario,
    form.unidades,
    negocioSeleccionado
  ]);


  // --- FORMATEADOR DE DECIMALES (CORRECCIÓN VISUAL SOLICITADA) ---
  const formatearValor = (valor, campoConfig) => {
    if (campoConfig.type === 'number' && !campoConfig.isInteger && valor !== undefined && valor !== null && valor !== "") {
       return parseFloat(valor).toFixed(2);
    }
    return valor;
  };

  // --- LÓGICA DE ELIMINAR SISTEMA ---
  const eliminarSistema = (nombreNegocio) => {
    if (window.confirm(`¿Seguro que deseas eliminar el sistema "${nombreNegocio}"?`)) {
      fetch(`http://localhost:8000/api/schemas/?nombre=${nombreNegocio}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Error en el servidor');
          setEsquemas(esquemas.filter(e => e.nombre !== nombreNegocio));
          if (negocioSeleccionado?.nombre === nombreNegocio) setNegocioSeleccionado(null);
        })
        .catch(err => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
    }
  };

  // --- LÓGICA DE FORMULARIO CON TODAS LAS VALIDACIONES (CORREGIDA) ---
  const handleInputChange = (e, campoConfig) => {
    let value = e.target.value;

    // 1. Validar Enteros
    if (campoConfig.type === 'number' && campoConfig.isInteger && value.includes('.')) return;
    
    // 2. Validar Decimales (Máximo 2)
    if (campoConfig.type === 'number' && value.includes('.')) {
      if (value.split('.')[1].length > 2) return;
    }

    // 3. Validar Longitud Máxima para TEXTO (DNI, Celular)
    if (campoConfig.type === 'text' && campoConfig.maxLength && value.length > parseInt(campoConfig.maxLength)) {
      return;
    }

    // 4. NUEVA VALIDACIÓN: Longitud Máxima para NÚMEROS
    if (campoConfig.type === 'number' && campoConfig.numLength) {
      // Remover el punto decimal para contar solo dígitos
      const soloDigitos = value.replace('.', '');
      if (soloDigitos.length > parseInt(campoConfig.numLength)) {
        return;
      }
    }

    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmitDatos = () => {
    // VALIDACIÓN ESTRICTA: No permitir campos vacíos (EXCEPTO LOS CALCULADOS)
    const camposRequeridos = negocioSeleccionado.campos.filter(c => {
      // Excluir el ID si es automático
      if (c.key === 'id' && negocioSeleccionado.config?.idAutomatico) return false;
      
      // Excluir campos calculados automáticamente
      if (c.type === 'calculated' || c.type === 'age' || c.type === 'license_status') return false;
      
      return true;
    });
    
    const hayVacios = camposRequeridos.some(c => !form[c.key] || form[c.key].toString().trim() === "");

    if (hayVacios) {
        Swal.fire({ title: 'Atención', text: 'Todos los campos definidos son obligatorios para el registro', icon: 'warning', background: '#1a1a1a', color: '#0f0' });
        return;
    }

    const payload = { ...form };
    const url = modoEdicion 
        ? `http://localhost:8000/api/data/${form.id}/?negocio=${negocioSeleccionado.nombre}`
        : 'http://localhost:8000/api/data/?negocio=' + negocioSeleccionado.nombre;
    const method = modoEdicion ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        fetchDatos(negocioSeleccionado.nombre);
        setForm({});
        setModoEdicion(false);
        Swal.fire({ title: 'Procesado', icon: 'success', timer: 1000, showConfirmButton: false, background: '#000', color: '#0f0' });
    });
  };

  // --- LÓGICA DE CARGA JSON (CORREGIDA Y COMPLETA) ---
  const manejarCargaDesdeJson = () => {
    try {
      const parsed = JSON.parse(jsonInputCarga);
      
      // Validar que los campos del JSON coincidan con el esquema (EXCEPTO LOS CALCULADOS)
      const camposEsquema = negocioSeleccionado.campos
        .filter(c => {
          // Excluir ID si es automático
          if (c.key === 'id' && negocioSeleccionado.config?.idAutomatico) return false;
          
          // Excluir campos calculados
          if (c.type === 'calculated' || c.type === 'age' || c.type === 'license_status') return false;
          
          return true;
        })
        .map(c => c.key);
      
      const camposJson = Object.keys(parsed);
      const camposFaltantes = camposEsquema.filter(c => !camposJson.includes(c));
      
      if (camposFaltantes.length > 0) {
        Swal.fire({
          title: 'Advertencia',
          text: `Faltan campos en el JSON: ${camposFaltantes.join(', ')}`,
          icon: 'warning',
          background: '#1a1a1a',
          color: '#0f0'
        });
        return;
      }

      // Actualizar el formulario visual
      setForm(parsed);
      
      // CORRECCIÓN PRINCIPAL: Enviar directamente al backend
      const url = 'http://localhost:8000/api/data/?negocio=' + negocioSeleccionado.nombre;
      
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      .then(res => {
        if (!res.ok) throw new Error('Error al guardar');
        return res.json();
      })
      .then(() => {
        fetchDatos(negocioSeleccionado.nombre);
        setForm({});
        Swal.fire({ 
          title: 'Éxito', 
          text: 'JSON cargado y registrado correctamente', 
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#000', 
          color: '#0f0' 
        });
      })
      .catch(err => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el registro: ' + err.message,
          icon: 'error',
          background: '#1a1a1a',
          color: '#0f0'
        });
      });
      
    } catch (e) {
      Swal.fire({
        title: 'Error',
        text: 'Formato JSON inválido',
        icon: 'error',
        background: '#1a1a1a',
        color: '#0f0'
      });
    }
  };

  const eliminarDato = (id) => {
      fetch(`http://localhost:8000/api/data/${id}/?negocio=${negocioSeleccionado.nombre}`, { method: 'DELETE' })
      .then(() => fetchDatos(negocioSeleccionado.nombre));
  };

  // --- LÓGICA DEL CONSTRUCTOR AVANZADO ---
  const agregarCampoBuilder = () => {
    if (!campoTemporal.label) return;
    const key = campoTemporal.label.toLowerCase().replace(/ /g, "_");
    setNuevosCampos([...nuevosCampos, { ...campoTemporal, key }]);
    setCampoTemporal({ 
      label: "", 
      type: "text", 
      maxLength: "", 
      options: "", 
      isInteger: false, 
      numLength: "", 
      decimals: "2",
      calculationType: "",
      field1: "",
      field2: "",
      sourceField: ""
    });
  };

  const guardarSistemaBuilder = () => {
    if (!nuevoSistemaNombre || nuevosCampos.length === 0) { Swal.fire('Error', 'Faltan datos', 'error'); return; }
    
    const nuevoEsquema = {
        nombre: nuevoSistemaNombre,
        config: { idAutomatico: idAutomatico },
        campos: [
            { key: 'id', label: 'ID', type: 'number', locked: idAutomatico, isInteger: true }, 
            ...nuevosCampos
        ]
    };

    fetch('http://localhost:8000/api/schemas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEsquema)
    }).then(res => res.json()).then(data => {
        setEsquemas([...esquemas, data]);
        setNuevoSistemaNombre("");
        setNuevosCampos([]);
        setMostrarCreador(false); 
        Swal.fire('Sistema Creado', 'Disponible en menú izquierdo', 'success');
    });
  };

  const camposConIdPrimero = (campos) => {
    return [...campos].sort((a, b) => (a.key === 'id' ? -1 : b.key === 'id' ? 1 : 0));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ mt: 2, mb: 4, minHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER RESPONSIVE */}
        <Box sx={{ borderBottom: '2px solid #333', mb: 2, pb: 1, display: 'flex', flexDirection: {xs:'column', sm:'row'}, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Terminal sx={{ fontSize: 35, mr: 2, color: '#000' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#000 !important' }}>
                    PLATAFORMA_MULTI_NEGOCIO
                </Typography>
            </Box>
            <Button 
                variant={mostrarCreador ? "contained" : "outlined"} 
                onClick={() => setMostrarCreador(!mostrarCreador)}
                startIcon={<PlaylistAdd/>}
                sx={{ color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#eee' } }}
            >
                {mostrarCreador ? "CANCELAR" : "CREAR NUEVO NEGOCIO"}
            </Button>
        </Box>

        {/* --- CREADOR DE SISTEMAS AVANZADO --- */}
        {mostrarCreador && (
            <Card sx={{ mb: 2, border: '2px dashed #000', bgcolor: '#1a1a1a', p: 1 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <TextField label="Nombre del Negocio (Ej: FARMACIA)" fullWidth value={nuevoSistemaNombre} onChange={(e)=>setNuevoSistemaNombre(e.target.value)} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{p:1, bgcolor:'#000', textAlign:'center', border:'1px solid #333'}}>
                                <Typography variant="caption" sx={{color:'#888'}}>CONTROL DE ID</Typography>
                                <FormControlLabel control={<Switch checked={idAutomatico} onChange={(e)=>setIdAutomatico(e.target.checked)}/>} label={idAutomatico ? "AUTOMÁTICO" : "MANUAL"} sx={{ml:1}} />
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12}><Divider sx={{my:1, bgcolor:'#333'}}/></Grid>

                        <Grid item xs={12} md={3}>
                            <TextField label="Nombre Dato (Ej: DNI)" fullWidth size="small" value={campoTemporal.label} onChange={(e)=>setCampoTemporal({...campoTemporal, label:e.target.value})} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="label-tipo-constructor">Formato</InputLabel>
                                <Select labelId="label-tipo-constructor" value={campoTemporal.type} label="Formato" onChange={(e)=>setCampoTemporal({...campoTemporal, type:e.target.value})}>
                                    <MenuItem value="text">Texto</MenuItem>
                                    <MenuItem value="number">Número</MenuItem>
                                    <MenuItem value="select">Lista (Select)</MenuItem>
                                    <MenuItem value="date">Fecha</MenuItem>
                                    <MenuItem value="calculated">Calculado (A × B)</MenuItem>
                                    <MenuItem value="age">Edad (Auto)</MenuItem>
                                    <MenuItem value="license_status">Estado Licencia</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                            {campoTemporal.type === 'text' && (
                                <TextField label="Máx Caracteres" size="small" fullWidth value={campoTemporal.maxLength} onChange={(e)=>setCampoTemporal({...campoTemporal, maxLength:e.target.value})} />
                            )}
                            {campoTemporal.type === 'number' && (
                                <Box sx={{display:'flex', gap:1}}>
                                    <TextField label="Long. Total" size="small" value={campoTemporal.numLength} onChange={(e)=>setCampoTemporal({...campoTemporal, numLength:e.target.value})} />
                                    <TextField label="Decimales" size="small" value={campoTemporal.decimals} onChange={(e)=>setCampoTemporal({...campoTemporal, decimals:e.target.value})} />
                                    <FormControlLabel control={<Checkbox checked={campoTemporal.isInteger} onChange={(e)=>setCampoTemporal({...campoTemporal, isInteger:e.target.checked})}/>} label="Enteros" />
                                </Box>
                            )}
                            {campoTemporal.type === 'select' && (
                                <TextField label="Opciones (Ej: M,F,X)" size="small" fullWidth value={campoTemporal.options} onChange={(e)=>setCampoTemporal({...campoTemporal, options:e.target.value})} />
                            )}
                            {campoTemporal.type === 'calculated' && (
                                <Box sx={{display:'flex', gap:1}}>
                                    <TextField label="Campo 1 (key)" size="small" placeholder="precio_unitario" value={campoTemporal.field1} onChange={(e)=>setCampoTemporal({...campoTemporal, field1:e.target.value})} />
                                    <Typography sx={{alignSelf:'center'}}>×</Typography>
                                    <TextField label="Campo 2 (key)" size="small" placeholder="cantidad" value={campoTemporal.field2} onChange={(e)=>setCampoTemporal({...campoTemporal, field2:e.target.value})} />
                                </Box>
                            )}
                            {campoTemporal.type === 'age' && (
                                <TextField label="Campo Fecha Nacimiento (key)" size="small" fullWidth placeholder="fecha_nacimiento" value={campoTemporal.sourceField} onChange={(e)=>setCampoTemporal({...campoTemporal, sourceField:e.target.value})} />
                            )}
                            {campoTemporal.type === 'license_status' && (
                                <TextField label="Campo Fecha Vencimiento (key)" size="small" fullWidth placeholder="fecha_vencimiento" value={campoTemporal.sourceField} onChange={(e)=>setCampoTemporal({...campoTemporal, sourceField:e.target.value})} />
                            )}
                        </Grid>
                        <Grid item xs={12} md={2}><Button variant="contained" fullWidth onClick={agregarCampoBuilder}>AÑADIR CAMPO</Button></Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#000', border: '1px solid #333' }}>
                        <Typography variant="caption" color="primary">VISTA PREVIA DE CAMPOS:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            {nuevosCampos.map((c, i) => (
                                <Box key={i} sx={{ border: '1px solid #0f0', p: '2px 8px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption">{c.label} [{c.type}]</Typography>
                                    <IconButton size="small" onClick={() => setNuevosCampos(nuevosCampos.filter((_, idx) => idx !== i))}>
                                        <Delete sx={{ fontSize: 14, color: 'red' }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={guardarSistemaBuilder}>GENERAR SISTEMA COMPLETO</Button>
                </CardContent>
            </Card>
        )}

        {/* --- LAYOUT PRINCIPAL --- */}
        <Grid container spacing={2} sx={{ flexGrow: 1, flexDirection: { xs: 'column', md: 'row' } }}>
            <Grid item xs={12} md={3}>
                <Paper sx={{ height: '100%', border: '1px solid #333', bgcolor: '#0a0a0a' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #333', display:'flex', alignItems:'center' }}>
                        <Storage sx={{ mr: 1 }} />
                        <Typography fontWeight="bold">SISTEMAS</Typography>
                    </Box>
                    <List>
                        {esquemas.map((esquema, index) => (
                            <ListItem key={index} disablePadding secondaryAction={
                                <IconButton edge="end" onClick={() => eliminarSistema(esquema.nombre)}>
                                    <Delete color="error" fontSize="small" />
                                </IconButton>
                            }>
                                <ListItemButton selected={negocioSeleccionado?.nombre === esquema.nombre} onClick={() => setNegocioSeleccionado(esquema)} sx={{ '&.Mui-selected': { bgcolor: '#111', borderRight: '4px solid #00ff00' } }}>
                                    <ListItemText primary={esquema.nombre} />
                                    {negocioSeleccionado?.nombre === esquema.nombre && <KeyboardArrowRight />}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            <Grid item xs={12} md={9}>
                {negocioSeleccionado ? (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Paper sx={{ p: 2, border: '1px solid #333', bgcolor: '#000' }}>
                             <Box sx={{display:'flex', justifyContent:'space-between', mb:2, borderBottom:'1px solid #333', pb:1}}>
                                <Typography variant="h6" color="primary">{negocioSeleccionado.nombre}</Typography>
                                <FactCheck sx={{color:'#555'}}/>
                             </Box>
                             <Grid container spacing={2}>
                                {camposConIdPrimero(negocioSeleccionado.campos).map((campo) => (
                                    <Grid item xs={12} sm={4} key={campo.key}>
                                        {campo.type === 'select' ? (
                                            <FormControl fullWidth size="small" sx={{ '& .MuiSelect-select': { minWidth: '150px' } }}>
                                                <InputLabel id={`lbl-${campo.key}`}>{campo.label}</InputLabel>
                                                <Select labelId={`lbl-${campo.key}`} value={form[campo.key] || ''} label={campo.label} name={campo.key} onChange={(e) => handleInputChange(e, campo)}>
                                                    {campo.options.split(',').map(opt => <MenuItem key={opt} value={opt.trim()}>{opt.trim()}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <TextField
                                                label={campo.label}
                                                name={campo.key}
                                                value={
                                                    campo.key === 'id' && negocioSeleccionado.config?.idAutomatico ? 'AUTO' : 
                                                    (campo.type === 'calculated' || campo.type === 'age' || campo.type === 'license_status') ? (form[campo.key] || 'Auto') :
                                                    (form[campo.key] || '')
                                                }
                                                onChange={(e) => handleInputChange(e, campo)}
                                                fullWidth size="small"
                                                type={campo.type === 'date' ? 'date' : 'text'}
                                                InputLabelProps={{ shrink: true }}
                                                disabled={
                                                    (campo.key === 'id' && negocioSeleccionado.config?.idAutomatico) ||
                                                    campo.type === 'calculated' ||
                                                    campo.type === 'age' ||
                                                    campo.type === 'license_status'
                                                }
                                                sx={{
                                                    '& .MuiInputBase-input.Mui-disabled': {
                                                        WebkitTextFillColor: campo.type === 'license_status' && form[campo.key] === 'VENCIDA' ? '#ff0000' : '#00ff00',
                                                        fontWeight: 'bold'
                                                    }
                                                }}
                                            />
                                        )}
                                    </Grid>
                                ))}
                                <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                                    <Button variant="contained" onClick={handleSubmitDatos} startIcon={modoEdicion ? <Edit/> : <Save />}>{modoEdicion ? 'ACTUALIZAR' : 'REGISTRAR'}</Button>
                                </Grid>
                             </Grid>
                        </Paper>

                        <TableContainer component={Paper} sx={{ flexGrow: 1, border: '1px solid #333', bgcolor: '#1a1a1a', overflowX: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead><TableRow>
                                    {camposConIdPrimero(negocioSeleccionado.campos).map(c => <TableCell key={c.key} sx={{bgcolor:'#000', color:'#0f0'}}>{c.label}</TableCell>)}
                                    <TableCell sx={{bgcolor:'#000', color:'#0f0'}}>OPC</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {datos.map((row, idx) => (
                                        <TableRow key={idx} hover>
                                            {camposConIdPrimero(negocioSeleccionado.campos).map(c => <TableCell key={c.key}>{formatearValor(row[c.key], c)}</TableCell>)}
                                            <TableCell>
                                                <IconButton size="small" onClick={() => {setForm(row); setModoEdicion(true)}}><Edit fontSize="small" sx={{color:'#0f0'}}/></IconButton>
                                                <IconButton size="small" onClick={() => eliminarDato(row.id)}><Delete fontSize="small" color="error"/></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* MÓDULO DE CARGA JSON (CORREGIDO Y FUNCIONAL) */}
                        <Card sx={{ border: '1px solid #0f0', bgcolor: '#000' }}>
                          <Box sx={{ p: 1, bgcolor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="primary">MODULO_CARGA_JSON (PLANTILLA SIN ID)</Typography>
                            <Button size="small" variant="outlined" onClick={manejarCargaDesdeJson} startIcon={<PlaylistAdd/>}>CARGAR Y REGISTRAR</Button>
                          </Box>
                          <textarea
                            style={{ width: '100%', height: '100px', backgroundColor: '#000', color: '#0f0', border: 'none', padding: '10px', fontFamily: 'Consolas', outline: 'none', resize: 'vertical' }}
                            value={jsonInputCarga}
                            onChange={(e) => setJsonInputCarga(e.target.value)}
                          />
                        </Card>
                    </Box>
                ) : <Box sx={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #000'}}><Typography sx={{color:'#000'}}>SELECCIONA UN SISTEMA</Typography></Box>}
            </Grid>
        </Grid>

        {/* VISOR GENERAL JSON (ABAJO, FORMATEADO CON 2 DECIMALES ESTRICTOS) */}
        <Box sx={{ mt: 2, height: '400px', bgcolor: '#1a1a1a', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1, bgcolor: '#000', borderBottom: '1px solid #333' }}>
                <Typography variant="caption" sx={{ color: '#ff0' }}>LIVE_DATA_STREAM_JSON (TOTAL 2 DECIMALS)</Typography>
            </Box>
            <Box sx={{ p: 1, overflow: 'auto', flexGrow: 1 }}>
                <pre style={{ margin: 0, color: '#00ff00', fontSize: '12px', fontFamily: 'Consolas' }}>
                    {JSON.stringify(datos.map(d => {
                        let f = {...d};
                        negocioSeleccionado?.campos.forEach(c => { if(c.type === 'number' && !c.isInteger) f[c.key] = parseFloat(d[c.key]).toFixed(2); });
                        return f;
                    }), null, 2)}
                </pre>
            </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;