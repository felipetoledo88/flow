import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({ email, password });
      toast.success('Login realizado com sucesso!', {
        duration: 3000, // 3 segundos
      });

      const from = location.state?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let message = 'Erro ao fazer login. Tente novamente.';
      
      if (error.response?.data?.message) {
        const errorMessage = Array.isArray(error.response.data.message) 
          ? error.response.data.message[0] 
          : error.response.data.message;
        switch (errorMessage) {
          case 'Email não encontrado':
            message = 'Email não encontrado. Verifique se o email está correto.';
            break;
          case 'Senha incorreta':
            message = 'Senha incorreta. Verifique se a senha está correta.';
            break;
          case 'Credenciais inválidas':
            message = 'Email ou senha incorretos. Verifique suas credenciais.';
            break;
          default:
            message = errorMessage;
        }
      }
      
      setError(message);
      toast.error(message, {
        duration: 3000, // 3 segundos
      });
    }
  }

  return (
    <div className="flex flex-row justify-center bg-white">
      {/* Left Side - Guide Left */}
      <div className="fixed w-[43.26vw] h-screen top-0 left-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 hidden lg:block shadow-2xl">
        <div className="absolute top-[37.78%] left-1/2 transform -translate-x-1/2 inline-flex flex-col items-center">
          <div className="relative flex flex-col items-center justify-center">
            <img src="/images/logo.png" alt="ScopeFlow" className="h-40 w-auto object-contain drop-shadow-2xl" />
          </div>
        </div>
      </div>

      {/* Right Side - Guide Right */}
      <div className="fixed w-full lg:w-[58.19vw] h-screen top-0 right-0 bg-white lg:rounded-l-[10px] lg:border-l">
        <div className="absolute top-[27.92%] left-1/2 transform -translate-x-1/2 w-[490px] min-h-[349px] flex flex-col justify-between px-4 lg:px-0">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-black mb-2">Bem-vindo de volta!</h2>
            <p className="text-gray-600 text-sm">Faça login para acessar sua conta</p>
          </div>
          
          <form onSubmit={handleLogin} className="min-h-[301px] inline-flex flex-col gap-5">
            
            <div className="inline-flex flex-col items-start justify-center gap-2">
              <Label htmlFor="email" className="text-black text-base font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="flex w-[490px] items-center gap-2 px-3 py-3 bg-white border border-gray-300 rounded-[10px] text-sm hover:border-red-600 focus:border-red-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="inline-flex flex-col items-start justify-center gap-2">
              <Label htmlFor="password" className="text-black text-base font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="flex w-[490px] items-center gap-2 px-3 py-3 pr-12 bg-white border border-gray-300 rounded-[10px] text-sm hover:border-red-600 focus:border-red-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 border-none bg-transparent text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5" style={{ color: '#a0a0a0' }} />
                  ) : (
                    <EyeOff className="h-5 w-5" style={{ color: '#a0a0a0' }} />
                  )}
                </button>
              </div>
            </div>

            <div className="h-5 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-red-600 text-xs font-semibold hover:text-red-700 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center items-center gap-2 w-[480px] text-center px-12 py-3 bg-red-600 rounded-[10px] font-bold text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Entrando...' : 'Login'}
              </Button>
            </div>

            {error && (
              <div className="text-center">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="fixed w-full h-[20vh] top-0 left-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 shadow-lg">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="flex items-center justify-center">
              <img src="/images/logo.png" alt="ScopeFlow" className="h-24 w-auto object-contain drop-shadow-xl" />
            </div>
          </div>
        </div>
        
        {/* Mobile Content */}
        <div className="fixed w-full h-[80vh] top-[20vh] left-0 bg-white">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[490px] px-4">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-black mb-2">Bem-vindo de volta!</h2>
              <p className="text-gray-600 text-sm">Faça login para acessar sua conta</p>
            </div>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="mobile-email" className="text-black text-base font-semibold">
                  E-mail
                </Label>
                <Input
                  id="mobile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="w-full px-3 py-3 bg-white border border-gray-300 rounded-[10px] text-sm hover:border-red-600 focus:border-red-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="mobile-password" className="text-black text-base font-semibold">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="mobile-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full px-3 py-3 pr-12 bg-white border border-gray-300 rounded-[10px] text-sm hover:border-red-600 focus:border-red-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 border-none bg-transparent text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" style={{ color: '#a0a0a0' }} />
                    ) : (
                      <EyeOff className="h-5 w-5" style={{ color: '#a0a0a0' }} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-red-600 text-xs font-semibold hover:text-red-700 transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-[10px] font-bold text-sm"
              >
                {isLoading ? 'Entrando...' : 'Login'}
              </Button>

              {error && (
                <div className="text-center">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;