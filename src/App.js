import React, { useState, useEffect } from 'react';
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

// --- TEMA HACKER (Fondo Blanco / Contrastes Negros y Verdes) ---
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00ff00' },
    background: { default: '#ffffff', paper: '#1a1a1a' },
    text: { primary: '#00ff00', secondary: '#00cc00' },
  },
  typography: { fontFamily: '"Consolas", monospace', allVariants: { color: '#00ff00' } },
  components: {
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
    // Estilo para el Switch
    MuiSwitch: {
      styleOverrides: {
        switchBase: { color: '#555', '&.Mui-checked': { color: '#00ff00' } },
        track: { backgroundColor: '#333', '&.Mui-checked': { backgroundColor: '#005500' } }
      }
    }
  }
});

function App() {
  // --- ESTADOS ---
  const [esquemas, setEsquemas] = useState([]); 
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null); 
  const [mostrarCreador, setMostrarCreador] = useState(false); 

  const [datos, setDatos] = useState([]);
  const [form, setForm] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);

  // --- ESTADOS DEL CONSTRUCTOR (RECUPERANDO VALIDACIONES) ---
  const [nuevoSistemaNombre, setNuevoSistemaNombre] = useState("");
  const [idAutomatico, setIdAutomatico] = useState(true); 
  const [nuevosCampos, setNuevosCampos] = useState([]);
  
  // Campo temporal CON PROPIEDADES AVANZADAS
  const [campoTemporal, setCampoTemporal] = useState({ 
      label: "", 
      type: "text", 
      maxLength: "",  // Para DNI
      options: "",    // Para Select (M,F)
      isInteger: false // Para enteros
  });

  // CARGAR AL INICIO
  useEffect(() => {
    fetch('http://localhost:8000/api/schemas/')
      .then(res => res.json())
      .then(setEsquemas);
  }, []);

  // CARGAR DATOS
  useEffect(() => {
    if (negocioSeleccionado) {
      fetchDatos(negocioSeleccionado.nombre);
      setForm({});
      setModoEdicion(false);
    }
  }, [negocioSeleccionado]);

  const fetchDatos = (nombreNegocio) => {
    fetch(`http://localhost:8000/api/data/?negocio=${nombreNegocio}`)
      .then(res => res.json())
      .then(setDatos);
  };

  // --- LÓGICA DE FORMULARIO INTELIGENTE ---
  const handleInputChange = (e, campoConfig) => {
    let value = e.target.value;

    // 1. Validar Enteros
    if (campoConfig.type === 'number' && campoConfig.isInteger && value.includes('.')) return;
    
    // 2. Validar Longitud Máxima (DNI, Celular)
    if (campoConfig.maxLength && value.length > parseInt(campoConfig.maxLength)) return;

    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmitDatos = () => {
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

  const eliminarDato = (id) => {
      fetch(`http://localhost:8000/api/data/${id}/?negocio=${negocioSeleccionado.nombre}`, { method: 'DELETE' })
      .then(() => fetchDatos(negocioSeleccionado.nombre));
  };

  // --- LÓGICA DEL CONSTRUCTOR AVANZADO ---
  const agregarCampoBuilder = () => {
    if (!campoTemporal.label) return;
    const key = campoTemporal.label.toLowerCase().replace(/ /g, "_");
    
    // Guardamos TODAS las propiedades (maxLength, options, isInteger)
    setNuevosCampos([...nuevosCampos, { ...campoTemporal, key }]);
    
    // Reset
    setCampoTemporal({ label: "", type: "text", maxLength: "", options: "", isInteger: false });
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4, height: '95vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <Box sx={{ borderBottom: '2px solid #333', mb: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        {/* 1. CONFIGURACIÓN GENERAL */}
                        <Grid item xs={8}>
                            <TextField 
                                label="Nombre del Negocio (Ej: FARMACIA)" 
                                fullWidth 
                                value={nuevoSistemaNombre} 
                                onChange={(e)=>setNuevoSistemaNombre(e.target.value)} 
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <Paper variant="outlined" sx={{p:1, bgcolor:'#000', textAlign:'center', border:'1px solid #333'}}>
                                <Typography variant="caption" sx={{color:'#888'}}>CONTROL DE ID</Typography>
                                <FormControlLabel 
                                    control={<Switch checked={idAutomatico} onChange={(e)=>setIdAutomatico(e.target.checked)}/>}
                                    label={idAutomatico ? "AUTOMÁTICO" : "MANUAL"}
                                    sx={{ml:1}}
                                />
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12}><Divider sx={{my:1, bgcolor:'#333'}}/></Grid>

                        {/* 2. DEFINICIÓN DE CAMPOS CON VALIDACIÓN */}
                        <Grid item xs={3}>
                            <TextField label="Nombre Dato (Ej: DNI)" fullWidth size="small" value={campoTemporal.label} onChange={(e)=>setCampoTemporal({...campoTemporal, label:e.target.value})} />
                        </Grid>
                        <Grid item xs={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Formato</InputLabel>
                                <Select value={campoTemporal.type} label="Formato" onChange={(e)=>setCampoTemporal({...campoTemporal, type:e.target.value})}>
                                    <MenuItem value="text">Texto</MenuItem>
                                    <MenuItem value="number">Número</MenuItem>
                                    <MenuItem value="select">Lista (Select)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        
                        {/* 3. REGLAS EXTRA (AQUI ESTÁ LA MAGIA) */}
                        <Grid item xs={4}>
                            {campoTemporal.type === 'text' && (
                                <TextField 
                                    label="Máx Caracteres (Ej: 8)" size="small" fullWidth 
                                    value={campoTemporal.maxLength} 
                                    onChange={(e)=>setCampoTemporal({...campoTemporal, maxLength:e.target.value})} 
                                />
                            )}
                            {campoTemporal.type === 'number' && (
                                <FormControlLabel 
                                    control={<Checkbox checked={campoTemporal.isInteger} onChange={(e)=>setCampoTemporal({...campoTemporal, isInteger:e.target.checked})}/>} 
                                    label="Solo Enteros" 
                                />
                            )}
                            {campoTemporal.type === 'select' && (
                                <TextField 
                                    label="Opciones (Ej: M,F,X)" size="small" fullWidth 
                                    value={campoTemporal.options} 
                                    onChange={(e)=>setCampoTemporal({...campoTemporal, options:e.target.value})} 
                                />
                            )}
                        </Grid>
                        <Grid item xs={2}><Button variant="contained" fullWidth onClick={agregarCampoBuilder}>AÑADIR CAMPO</Button></Grid>
                    </Grid>
                    
                    {/* PREVIEW */}
                    <Box sx={{ mt: 2, display:'flex', gap:1, flexWrap:'wrap' }}>
                        {nuevosCampos.map((c, i) => (
                            <Typography key={i} variant="caption" sx={{ border: '1px solid #333', p: 0.5, bgcolor:'#000' }}>
                                {c.label} [{c.type}]
                            </Typography>
                        ))}
                    </Box>
                    <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={guardarSistemaBuilder}>GENERAR SISTEMA</Button>
                </CardContent>
            </Card>
        )}

        {/* --- LAYOUT PRINCIPAL --- */}
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            
            {/* IZQUIERDA: MENÚ */}
            <Grid item xs={12} md={3}>
                <Paper sx={{ height: '100%', border: '1px solid #333', bgcolor: '#0a0a0a' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #333', display:'flex', alignItems:'center' }}>
                        <Storage sx={{ mr: 1 }} />
                        <Typography fontWeight="bold">SISTEMAS</Typography>
                    </Box>
                    <List>
                        {esquemas.map((esquema, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton 
                                    selected={negocioSeleccionado?.nombre === esquema.nombre}
                                    onClick={() => setNegocioSeleccionado(esquema)}
                                    sx={{ '&.Mui-selected': { bgcolor: '#111', borderRight: '4px solid #00ff00' } }}
                                >
                                    <ListItemText primary={esquema.nombre} />
                                    {negocioSeleccionado?.nombre === esquema.nombre && <KeyboardArrowRight />}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* DERECHA: TRABAJO */}
            <Grid item xs={12} md={9}>
                {negocioSeleccionado ? (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        {/* FORMULARIO DINÁMICO */}
                        <Paper sx={{ p: 2, border: '1px solid #333', bgcolor: '#000' }}>
                             <Box sx={{display:'flex', justifyContent:'space-between', mb:2, borderBottom:'1px solid #333', pb:1}}>
                                <Typography variant="h6" color="primary">{negocioSeleccionado.nombre}</Typography>
                                <FactCheck sx={{color:'#555'}}/>
                             </Box>

                             <Grid container spacing={2}>
                                {negocioSeleccionado.campos.map((campo) => (
                                    <Grid item xs={12} sm={4} key={campo.key}>
                                        
                                        {/* RENDERIZADO CONDICIONAL SEGÚN FORMATO */}
                                        {campo.type === 'select' ? (
                                            <FormControl fullWidth size="small">
                                                <InputLabel>{campo.label}</InputLabel>
                                                <Select
                                                    value={form[campo.key] || ''}
                                                    label={campo.label}
                                                    name={campo.key}
                                                    onChange={(e) => handleInputChange(e, campo)}
                                                >
                                                    {/* Generar opciones desde string guardado */}
                                                    {campo.options.split(',').map(opt => (
                                                        <MenuItem key={opt} value={opt.trim()}>{opt.trim()}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <TextField
                                                label={campo.label}
                                                name={campo.key}
                                                // ID Automático: Mostrar "AUTO" / Manual: Mostrar valor
                                                value={campo.key === 'id' && negocioSeleccionado.config?.idAutomatico ? 'AUTO' : (form[campo.key] || '')}
                                                onChange={(e) => handleInputChange(e, campo)}
                                                fullWidth size="small"
                                                type={campo.type === 'number' ? 'number' : 'text'}
                                                disabled={campo.key === 'id' && negocioSeleccionado.config?.idAutomatico}
                                                // Mostrar ayuda si hay limite
                                                helperText={campo.maxLength ? `Máx: ${campo.maxLength}` : ''}
                                            />
                                        )}

                                    </Grid>
                                ))}
                                <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                                    {modoEdicion && <Button color="error" onClick={() => {setModoEdicion(false); setForm({})}}>CANCELAR</Button>}
                                    <Button variant="contained" onClick={handleSubmitDatos} startIcon={modoEdicion ? <Edit/> : <Save />}>
                                        {modoEdicion ? 'ACTUALIZAR' : 'REGISTRAR'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* TABLA */}
                        <TableContainer component={Paper} sx={{ flexGrow: 1, border: '1px solid #333', bgcolor: '#1a1a1a' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {negocioSeleccionado.campos.map(c => <TableCell key={c.key} sx={{bgcolor:'#000', color:'#0f0'}}>{c.label}</TableCell>)}
                                        <TableCell sx={{bgcolor:'#000', color:'#0f0'}}>OPC</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {datos.map((row, idx) => (
                                        <TableRow key={idx} hover>
                                            {negocioSeleccionado.campos.map(c => <TableCell key={c.key}>{row[c.key]}</TableCell>)}
                                            <TableCell>
                                                <IconButton size="small" onClick={() => {setForm(row); setModoEdicion(true)}}><Edit fontSize="small" sx={{color:'#00cc00'}}/></IconButton>
                                                <IconButton size="small" onClick={() => eliminarDato(row.id)}><Delete fontSize="small" color="error"/></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    </Box>
                ) : (
                    <Box sx={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #ccc'}}>
                        <Typography sx={{color:'#000'}}>SELECCIONA UN SISTEMA</Typography>
                    </Box>
                )}
            </Grid>
        </Grid>

        {/* 3. ABAJO: JSON VIEWER */}
        <Box sx={{ mt: 2, height: '150px', bgcolor: '#1a1a1a', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 0.5, bgcolor: '#000', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' }}>
                <DataObject sx={{ fontSize: 16, mr: 1, color: '#ff0' }} />
                <Typography variant="caption" sx={{ color: '#ff0' }}>LIVE_JSON_STREAM</Typography>
            </Box>
            <Box sx={{ p: 1, overflow: 'auto', flexGrow: 1 }}>
                <pre style={{ margin: 0, color: '#00ff00', fontSize: '11px', fontFamily: 'Consolas' }}>
                    {JSON.stringify(datos, null, 2)}
                </pre>
            </Box>
        </Box>

      </Container>
    </ThemeProvider>
  );
}

export default App;